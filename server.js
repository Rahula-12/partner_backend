const express = require("express");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const serviceAccount = require("./firebase-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const deviceTokens = new Set();

app.get("/", (req, res) => {
  res.json({
    status: "running",
    registeredDevices: deviceTokens.size,
  });
});

app.post("/register-token", (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Token is required",
    });
  }

  deviceTokens.add(token);

  res.json({
    success: true,
    totalTokens: deviceTokens.size,
    message: "Token registered successfully",
  });
});

app.post("/send-notification", async (req, res) => {
    try {
        const tokens = [...deviceTokens];

        const response = await admin.messaging().sendEachForMulticast({
            notification: {
                title: "Notification",
                body: "Riya agreed 😇."
            },
            tokens
        });

        const errors = [];

        response.responses.forEach((resp, index) => {
            if (!resp.success) {
                errors.push({
                    token: tokens[index],
                    code: resp.error?.code,
                    message: resp.error?.message
                });
            }
        });

        return res.json({
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
            errors
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    }
});

app.get("/tokens", (req, res) => {
  res.json({
    totalTokens: deviceTokens.size,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
