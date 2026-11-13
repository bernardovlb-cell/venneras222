import { connect } from "./db";
import { seedDemo } from "../src/server/seed/demo";

const { db, close } = connect();
await seedDemo(db);
console.log("Dados de DEMONSTRAÇÃO criados (marcados com [DEMO]). Remova com: npm run db:purge-demo");
await close();
