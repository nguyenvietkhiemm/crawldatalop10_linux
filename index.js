const axios = require('axios');
const cheerio = require('cheerio');
const { exec } = require('child_process');
const querystring = require('querystring');
const Firestore = require('@google-cloud/firestore');
const fs = require('fs');
const path = require('path');

const url = 'https://tsdaucap.hanoi.gov.vn/tra-cuu-tuyen-sinh-10';
const getcaptcha = 'https://tsdaucap.hanoi.gov.vn/getcaptcha';

const db = new Firestore({
    projectId: 'alittledaisy',
    keyFilename: './key.json',
    databaseId: 'alittledaisydatabase'
});

// Đường dẫn đến file log
const logFilePath = path.join(__dirname, 'app.log');
const latestFile = path.join(__dirname, 'latest.log');

function logMessage(message) {
    console.log(logEntry);
    const logEntry = `${new Date().toISOString()} - ${message}\n`;
    fs.appendFile(logFilePath, logEntry, (err) => {
        if (err) throw err;
    });
}

function logLastest(i) {
    try {
        fs.writeFileSync(latestFile, i.toString(), 'utf8');
    } catch (err) {
        console.error(`Lỗi khi ghi file: ${err.message}`);
    }
}

async function addData(SBD, ma_hoc_sinh, ho_ten, ngu_van, ngoai_ngu, toan, tong_diem) {
    // Tạo một document mới
    const docRef = db.collection('Student').doc(SBD);

    try {
        await docRef.set({
            SBD,
            ma_hoc_sinh,
            ho_ten,
            ngu_van,
            ngoai_ngu,
            toan,
            tong_diem,
        });
        logMessage(`Saved document with SBD: ${SBD}`);
    }
    catch (error) {
        logMessage(`Error saving document with SBD: ${SBD} - ${error.message}`);
    }
}

async function run(SBD) {
    try {
        const res = await axios.get(url);
        const $ = cheerio.load(res.data);
        const token = $('input[name="__RequestVerificationToken"]').val();
        const rescookies = res.headers['set-cookie'];
        const cookies = rescookies.map(cookie => cookie.split(';')[0]);

        const resCaptcha = await axios.get(getcaptcha);
        const time = resCaptcha.data.time;
        const image = resCaptcha.data.image;

        const decode = await new Promise((resolve, reject) => {
            const activateVenvCommand = `source venv/bin/activate && python3 decode.py ${image}`;
            exec(`/bin/bash -c "${activateVenvCommand}"`, (e, stdout, stderr) => {
                if (e) {
                    logLastest(SBD);
                    return reject(`Lỗi: ${e.message}`);
                }

                if (stderr) {
                    logLastest(SBD);
                    return reject(`Lỗi: ${stderr}`);
                }

                resolve(stdout.trim());
            });
        });

        const formData = {
            LOAI_TRA_CUU: '02',
            GIA_TRI: SBD,
            CaptchaTime: time,
            CaptchaInput: decode
        };

        const config = {
            method: 'post',
            url: "https://tsdaucap.hanoi.gov.vn/tra-cuu-diem-thi-10",
            headers: {
                'Cookie': cookies.join(';'),
                'RequestVerificationToken': token,
            },
            data: querystring.stringify(formData),
        };
        const response = await axios(config);
        if (response.data.kq) {
            const SBD = response.data.kq.soBaoDanh;
            const ma_hoc_sinh = response.data.kq.maHocSinh;
            const ho_ten = response.data.kq.hoTen;
            let ngu_van = 0;
            let ngoai_ngu = 0;
            let toan = 0;
            let tong_diem = 0;
            var map = {
                "Ngữ văn": 0,
                "Ngoại ngữ": 0,
                "Toán": 0,
                "Tổng điểm XT": 0
            }

            for (let i of response.data.kq.diemThi.split(';')) {
                let [mon_hoc, diem] = i.split(': ');
                map[mon_hoc.trim()] = Number(diem);
            }

            ngu_van = map["Ngữ văn"];
            ngoai_ngu = map["Ngoại ngữ"];
            toan = map["Toán"];
            tong_diem = map["Tổng điểm XT"]; // cho chắc thôi chứ xử lí thế này hơi cồng kềnh
            // logMessage(`${SBD} ${ma_hoc_sinh} ${ho_ten} ${ngu_van} ${ngoai_ngu} ${toan} ${tong_diem}`)

            addData(SBD, ma_hoc_sinh, ho_ten, ngu_van, ngoai_ngu, toan, tong_diem).catch(error => {
                logMessage(error);
            });
        }
        return response.data.result | response.data.message == "Không tìm thấy hồ sơ thí sinh, vui lòng kiểm tra lại.";

    } catch (error) {
        logMessage(`Lỗi trong quá trình tra cứu SBD ${SBD}: ${error}`);
    }
}

async function main() {

    const defaultValue = 1101;
    let i;
    try {
        if (fs.existsSync(latestFile)) {
            const data = fs.readFileSync(latestFile, 'utf8').trim();
            if (data) {
                i = parseInt(data, 10);
                if (isNaN(i)) {
                    console.warn(`Giá trị trong file không phải là số hợp lệ, sử dụng giá trị mặc định ${defaultValue}`);
                    i = defaultValue;
                }
            } else {
                console.warn(`File rỗng, sử dụng giá trị mặc định ${defaultValue}`);
                i = defaultValue;
            }
        }
        else {
            console.warn(`File không tồn tại, sử dụng giá trị mặc định ${defaultValue}`);
            i = defaultValue;
            try {
                fs.writeFileSync(latestFile, defaultValue.toString(), 'utf8');
                console.log(`Đã khởi tạo file ${latestFile} với giá trị mặc định ${defaultValue}`);
            } catch (err) {
                console.error(`Lỗi khi khởi tạo file: ${err.message}`);
            }
        }
    }
    catch (err) {
        console.error(`Lỗi khi đọc file: ${err.message}, sử dụng giá trị mặc định ${defaultValue}`);
        i = defaultValue;
    }

    // let max = 0;
    // while (i <= 1000000) {
    //     let SBD = i.toString().padStart(6, '0');
    //     console.log(`Đang crawl ${SBD}`);
    //     let res = await run(SBD);
    //     if (res | max > 10) {
    //         i++;
    //         max = 0;
    //         logLastest(i);
    //     }
    //     else {
    //         max++;
    //     }
    // }

    const batchSize = 10; // Số lượng yêu cầu gửi đồng thời
    let queue = [];
    while (i <= 500000 | queue.length > 0) {
        let promises = [];
        let SBDs = [];

        // Thêm các SBD vào batch
        while (promises.length < batchSize) {
            let SBD = (queue.length > 0) ? queue.shift() : (i++).toString().padStart(6, '0');
            promises.push(run(SBD));
            SBDs.push(SBD);
        }

        // Chờ cho tất cả các yêu cầu trong batch hoàn thành
        let results = await Promise.all(promises);

        results.forEach((res, index) => {
            if (!res) {
                // Nếu không nhận được kết quả, thêm SBD vào queue để thử lại
                queue.push(SBDs[index]);
                // logMessage(`Thêm vào hàng đợi ${SBDs[index]}`);
                console.log(`Thêm vào hàng đợi ${SBDs[index]} vào ${queue}`);
            }
        });
    }
}

async function main() {
    let i = 1101;
    const batchSize = 10; // Số lượng yêu cầu gửi đồng thời
    let queue = [];

    while (i <= 500000 | queue.length > 0) {
        let promises = [];
        let SBDs = [];

        // Thêm các SBD vào batch
        while (promises.length < batchSize) {
            let SBD = (queue.length > 0) ? queue.shift() : (i++).toString().padStart(6, '0');
            promises.push(run(SBD));
            SBDs.push(SBD);
        }

        // Chờ cho tất cả các yêu cầu trong batch hoàn thành
        let results = await Promise.all(promises);

        results.forEach((res, index) => {
            if (!res) {
                // Nếu không nhận được kết quả, thêm SBD vào queue để thử lại
                queue.push(SBDs[index]);
                // logMessage(`Thêm vào hàng đợi ${SBDs[index]}`);
                console.log(`Thêm vào hàng đợi ${SBDs[index]}`);
            }
        });
    }
}

main();
