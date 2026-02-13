import { connection } from "./db";

async function checkDatabase() {
  try {
    console.log("Проверка подключения к базе данных...");
    
    const [tables] = await connection.query("SHOW TABLES");
    console.log("\n✅ Подключение успешно!");
    console.log("\nТаблицы в базе данных:");
    console.log(tables);
    
    if (Array.isArray(tables) && tables.length > 0) {
      console.log("\nНайдено таблиц:", tables.length);
      tables.forEach((row: any) => {
        console.log("  -", Object.values(row)[0]);
      });
    } else {
      console.log("\n⚠️  Таблицы не найдены. Запустите миграцию: tsx server/migrate.ts");
    }
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Ошибка:", error);
    process.exit(1);
  }
}

checkDatabase();
