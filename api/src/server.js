const express = require("express");
const apiRoutes = require("./routes");

const PORT = process.env.PORT || 3000;

const app = express();
app.use("/api", apiRoutes);

app.listen(PORT, () => {
  console.log(`otel-lab API listening on http://0.0.0.0:${PORT}`);
});
