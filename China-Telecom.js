
// ================ Shadowrocket 脚本 ================
/*
脚本名称: 电信金豆自动签到兑换话费
作者: @YourName
支持版本: Shadowrocket
使用说明: 配合BoxJS使用，需要配置手机号和服务密码

[Script]
电信金豆自动签到 = type=cron,cronexp=30 7 * * *,script-path=telecom_auto_points.js,timeout=60,wake-system=1
电信金豆自动兑换话费 = type=cron,cronexp=0 10 * * *,script-path=telecom_auto_points.js,timeout=60,wake-system=1

[MITM]
hostname = wapside.189.cn:*
*/

const $ = new Env('电信金豆自动签到兑换话费');
const notify = $.isNode() ? require('./sendNotify') : '';

// 配置信息
const phone = $.getdata('telecom_phone') || '';
const password = $.getdata('telecom_password') || '';
const exchangeThreshold = parseInt($.getdata('exchange_threshold')) || 1000;
const notificationSwitch = $.getdata('notification_switch') !== 'false';

let token = '';
let retryCount = 0;
const maxRetries = 3;

!(async () => {
    if (!phone || !password) {
        $.msg($.name, '❌ 错误', '手机号和密码不能为空');
        return;
    }
    
    try {
        // 登录获取token
        await loginWithRetry();
        
        // 执行签到
        if (new Date().getHours() === 7 && new Date().getMinutes() === 30) {
            const signResult = await signIn();
            if (signResult.success) {
                const message = `签到成功\n获得金豆: ${signResult.points}`;
                if (notificationSwitch) {
                    $.msg($.name, '✅ 签到成功', message);
                }
                $.log(message);
            }
        }
        
        // 查询金豆数量
        const pointsResult = await queryPoints();
        $.log(`当前金豆数量: ${pointsResult.points}`);
        
        // 执行兑换
        if (new Date().getHours() === 10 && new Date().getMinutes() === 0) {
            if (pointsResult.points >= exchangeThreshold) {
                const exchangeResult = await exchangePoints(pointsResult.points);
                const message = `兑换成功\n金豆数量: ${pointsResult.points}\n兑换金额: ${exchangeResult.amount/100}元`;
                
                if (notificationSwitch) {
                    $.msg($.name, '✅ 兑换成功', message);
                }
                $.log(message);
            } else {
                const message = `当前金豆(${pointsResult.points})未达到兑换阈值(${exchangeThreshold})`;
                if (notificationSwitch) {
                    $.msg($.name, '⚠️ 未达兑换标准', message);
                }
                $.log(message);
            }
        }
    } catch (e) {
        const message = `执行失败: ${e.message || e}`;
        $.log('', `❌ ${$.name}, 失败! 原因: ${message}`, '');
        if (notificationSwitch) {
            $.msg($.name, '❌ 执行失败', message);
        }
    }
})()
.catch((e) => $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, ''))
.finally(() => $.done());

async function loginWithRetry() {
    while (retryCount < maxRetries) {
        try {
            await login();
            return;
        } catch (e) {
            retryCount++;
            if (retryCount === maxRetries) throw e;
            await $.wait(2000);
        }
    }
}

function login() {
    return new Promise((resolve, reject) => {
        const options = {
            url: 'https://wapside.189.cn:9001/login/auth',
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)',
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify({
                phoneNum: phone,
                servicePassword: password
            })
        }
        
        $.post(options, (err, resp, data) => {
            try {
                if (err) throw err;
                const result = JSON.parse(data);
                if (result.code === 0) {
                    token = result.data.token;
                    resolve();
                } else {
                    throw new Error(result.msg || '登录失败');
                }
            } catch (e) {
                reject(e);
            }
        })
    })
}

function queryPoints() {
    return new Promise((resolve, reject) => {
        const options = {
            url: 'https://wapside.189.cn:9001/points/query',
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)'
            }
        }
        $.get(options, (err, resp, data) => {
            try {
                if (err) throw err;
                const result = JSON.parse(data);
                if (result.code === 0) {
                    resolve({ points: result.data.points });
                } else {
                    throw new Error(result.msg || '查询失败');
                }
            } catch (e) {
                reject(e);
            }
        })
    })
}

function signIn() {
    return new Promise((resolve, reject) => {
        const options = {
            url: 'https://wapside.189.cn:9001/jf/sign/userSign',
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)',
                'Content-Type': 'application/json;charset=utf-8'
            }
        }
        $.post(options, (err, resp, data) => {
            try {
                if (err) throw err;
                const result = JSON.parse(data);
                if (result.code === 0) {
                    resolve({ 
                        success: true,
                        points: result.data.prizeName || '未知数量'
                    });
                } else {
                    throw new Error(result.msg || '签到失败');
                }
            } catch (e) {
                reject(e);
            }
        })
    })
}

function exchangePoints(points) {
    return new Promise((resolve, reject) => {
        const options = {
            url: 'https://wapside.189.cn:9001/points/exchange/charge',
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)',
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify({
                points: points,
                phone: phone
            })
        }
        $.post(options, (err, resp, data) => {
            try {
                if (err) throw err;
                const result = JSON.parse(data);
                if (result.code === 0) {
                    resolve({ amount: points });
                } else {
                    throw new Error(result.msg || '兑换失败');
                }
            } catch (e) {
                reject(e);
            }
        })
    })
}
   
