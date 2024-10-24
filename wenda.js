app.command('addquestion <question> <answer>')
  .admin()
  .action(async ({ session }, question, answer) => {
    await app.database.create('questions', { question, answer });
    return `问题 "${question}" 的答案 "${answer}" 已添加。`;
  });
