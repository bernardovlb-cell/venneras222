import { connect } from "./db";
import { seedBase } from "../src/server/seed/base";

const { db, close } = connect();
await seedBase(db);
console.log("Dados estruturais criados (papéis, categorias, seções da home, modalidades de entrega desativadas, rascunhos de políticas).");
await close();
