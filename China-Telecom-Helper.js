/*
电信自动金豆兑换话费脚本
适用于 BoxJs 和 Shadowrocket
*/

// 定义任务信息
const taskName = "电信金豆兑话费";
const loginUrl = "https://login.189.cn/web/login";
const redeemUrl = "https://www.189.cn/integral/redeem";

// 用户登录信息（需要从 BoxJs 中获取）
const username = $persistentStore.read("ctcc_username") || ""; // 用户名
const password = $persistentStore.read("ctcc_password") || ""; // 密码

// 定义兑换金额（可以通过 BoxJs 设置）
const redeemAmount = $persistentStore.read("redeem_amount") || 10; // 默认兑换 10 元

(async () => {
  if (!username || !password) {
    console.log(`${taskName}: 用户名或密码未设置，请检查 BoxJs 设置`);
    $notify(taskName, "失败", "未配置用户名或密码，请检查设置");
    $done();
  }

  try {
    // 登录流程
    const loginResponse = await login(username, password);
    if (!loginResponse || loginResponse.status !== 200) {
      console.log(`${taskName}: 登录失败`);
      $notify(taskName, "登录失败", "请检查用户名或密码是否正确");
      $done();
    }

    console.log(`${taskName}: 登录成功，开始兑换金豆`);
    
    // 执行兑换
    const redeemResponse = await redeemGold(redeemAmount);
    if (redeemResponse && redeemResponse.status === 200) {
      console.log(`${taskName}: 兑换成功，兑换金额为 ${redeemAmount} 元`);
      $notify(taskName, "兑换成功", `已成功兑换 ${redeemAmount} 元话费`);
    } else {
      console.log(`${taskName}: 兑换失败`);
      $notify(taskName, "兑换失败", `请检查兑换规则或金豆余额`);
    }
  } catch (error) {
    console.log(`${taskName}: 出现错误 - ${error.message}`);
    $notify(taskName, "任务失败", `错误详情: ${error.message}`);
  }
  $done();
})();

// 登录函数
async function login(username, password) {
  const options = {
    url: loginUrl,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  };
  return await httpRequest(options);
}

// 兑换金豆函数
async function redeemGold(amount) {
  const options = {
    url: redeemUrl,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount }),
  };
  return await httpRequest(options);
}

// HTTP 请求封装
function httpRequest(options) {
  return new Promise((resolve, reject) => {
    $task.fetch(options).then(
      (response) => resolve(response),
      (error) => reject(error)
    );
  });
}
