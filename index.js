const axios = require('axios');
const cheerio = require('cheerio');
const { exec } = require('child_process');
const querystring = require('querystring');
const { Firestore } = require('@google-cloud/firestore');

const url = 'https://tsdaucap.hanoi.gov.vn/tra-cuu-tuyen-sinh-10';
const getcaptcha = 'https://tsdaucap.hanoi.gov.vn/getcaptcha';
const firestore = new Firestore({
    projectId: 'alittledaisy',
});

async function addData(SBD, ma_hoc_sinh, ho_ten, ngu_van, ngoai_ngu, toan, tong_diem) {
    // Tạo một document mới
    const docRef = firestore.collection('Students').doc(SBD);

    // Lưu dữ liệu vào Firestore
    await docRef.set({
        SBD,
        ma_hoc_sinh,
        ho_ten,
        ngu_van,
        ngoai_ngu,
        toan,
        tong_diem,
    });

    console.log(`Saved document with SBD: ${SBD}`);
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
                    return reject(`Lỗi: ${e.message}`);
                }

                if (stderr) {
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
            console.log(SBD, ma_hoc_sinh, ho_ten, ngu_van, ngoai_ngu, toan, tong_diem);

            addData(SBD, ma_hoc_sinh, ho_ten, ngu_van, ngoai_ngu, toan, tong_diem).catch(console.error);
        }
        return response.data.result | response.data.message == "Không tìm thấy hồ sơ thí sinh, vui lòng kiểm tra lại.";

    } catch (error) {
        console.error(`Lỗi trong quá trình tra cứu SBD ${SBD}:`, error);
    }
}

async function main() {
    let i = 1101;
    let max = 0;
    while (i <= 1000000) {
        let SBD = i.toString().padStart(6, '0');
        let res = await run(SBD);
        if (res | max > 10) {
            i++;
            max = 0;
        }
        else {
            max++;
        }
    }
}

main();
