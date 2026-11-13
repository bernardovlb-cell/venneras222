import { connect } from "./db";
import { purgeDemo } from "../src/server/seed/demo";

const { db, close } = connect();
const r = await purgeDemo(db);
console.log("Dados de demonstração removidos:", r);
await close();
