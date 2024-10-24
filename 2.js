const { App } = require('koishi');
const { Database } = require('@koishijs/plugin-database-sqlite');

const app = new App({
  type: 'onebot',
  selfId: 'YOUR_BOT_ID',
  token: 'YOUR_BOT_TOKEN',
});

app.plugin(Database, {
  name: 'sqlite',
  // 数据库文件
  path: './koishi.db',
});

// 初始化数据库
app.command('init')
  .action(async ({ session }) => {
    await app.database.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        points INTEGER DEFAULT 10
      );
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL
      );
    `);
    return '数据库已初始化！';
  });

// 注册用户积分信息
app.middleware(async (session, next) => {
  const user = await app.database.get('users', { user_id: session.userId });
  if (!user.length) {
    await app.database.create('users', { user_id: session.userId, points: 10 });
    session.send('欢迎使用智能问答系统，您已获得10积分！');
  }
  return next();
});

// 查询积分
app.command('points')
  .action(async ({ session }) => {
    const user = await app.database.get('users', { user_id: session.userId });
    if (user.length) {
      return `您的积分余额为：${user[0].points}。`;
    }
    return '用户未注册，请重新尝试。';
  });

// 查询问题，并扣除积分
app.command('ask <question:text>')
  .action(async ({ session }, question) => {
    const user = await app.database.get('users', { user_id: session.userId });
    if (!user.length) return '用户未注册。';

    const userPoints = user[0].points;
    if (userPoints < 1) {
      return '您的积分不足，无法进行查询。';
    }

    // 查找问题的答案
    const answer = await app.database.get('questions', { question });
    if (!answer.length) return '抱歉，未找到该问题的答案。';

    // 扣除积分
    await app.database.set('users', { user_id: session.userId }, { points: userPoints - 1 });
    return `答案：${answer[0].answer}（已扣除1积分，当前积分：${userPoints - 1}）`;
  });

// 管理员为用户增加积分
app.command('addpoints <userId> <amount>')
  .admin()
  .action(async ({ session }, userId, amount) => {
    const user = await app.database.get('users', { user_id: userId });
    if (!user.length) return '未找到该用户。';

    const newPoints = user[0].points + parseInt(amount);
    await app.database.set('users', { user_id: userId }, { points: newPoints });
    return `已为用户 ${userId} 增加 ${amount} 积分，当前积分：${newPoints}。`;
  });

// 启动应用
app.start();
