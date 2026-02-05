module.exports = {
  apps: [
    {
      name: "ecommerce-backend",
      cwd: "./backend",
      script: "src/server.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "ecommerce-colaborador",
      cwd: "./frontend-colaborador",
      script: "server-colaborador.cjs",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "ecommerce-admin",
      cwd: "./frontend-admin",
      script: "server-admin.cjs",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
