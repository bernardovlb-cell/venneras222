import next from "eslint-config-next";
const config = [
  ...next,
  { ignores: [".next/**", "node_modules/**", "drizzle/**", "public/**", "test-results/**"] },
];
export default config;
