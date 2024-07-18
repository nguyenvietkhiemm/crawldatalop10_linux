const axios = require('axios');
const cheerio = require('cheerio');
const { exec } = require('child_process');
const querystring = require('querystring');
const { Datastore } = require('@google-cloud/datastore');

const url = 'https://tsdaucap.hanoi.gov.vn/tra-cuu-tuyen-sinh-10';
const getcaptcha = 'https://tsdaucap.hanoi.gov.vn/getcaptcha';
const datastore = new Datastore();

async function addData(SBD, ma_hoc_sinh, ho_ten, ngu_van, ngoai_ngu, toan, tong_diem) {
    // Tạo một entity mới
    const taskKey = datastore.key('Student');
    const entity = {
        key: taskKey,
        data: {
            SBD,
            ma_hoc_sinh,
            ho_ten,
            ngu_van,
            ngoai_ngu,
            toan,
            tong_diem,
        }
    };

    // Lưu entity vào Datastore
    await datastore.save(entity);

    console.log(`Saved ${entity.key.name}: ${entity.data.description}`);
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
        console.log(`Kết quả tra cứu SBD ${SBD}:`, response.data);
        return response.data;

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
