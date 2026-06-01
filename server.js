const express = require("express");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/**
 * Firebase Initialization from Environment Variable
 *
 * Environment Variable:
 * FIREBASE_SERVICE_ACCOUNT
 *
 * Paste the entire service-account.json content as the value.
 */
let serviceAccount;

try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable not found");
    }

    serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT
    );

    // Fix escaped newlines in Render
    serviceAccount.private_key =
        serviceAccount.private_key.replace(/\\n/g, "\n");

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    console.log(
        `Firebase initialized for project: ${serviceAccount.project_id}`
    );

} catch (error) {
    console.error("Firebase initialization failed:", error);
    process.exit(1);
}

/**
 * In-memory storage
 * NOTE:
 * Tokens will be lost whenever Render restarts.
 * Use MongoDB/Postgres in production.
 */
const deviceTokens = new Set();

/**
 * Health Check
 */
app.get("/", (req, res) => {
    res.json({
        status: "running",
        firebaseProject: serviceAccount.project_id,
        registeredDevices: deviceTokens.size,
    });
});

/**
 * Register Device Token
 */
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

/**
 * Debug Tokens
 */
app.get("/debug-tokens", (req, res) => {
    res.json({
        count: deviceTokens.size,
        tokens: [...deviceTokens],
    });
});

/**
 * Firebase Info
 */
app.get("/firebase-info", (req, res) => {
    res.json({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
    });
});

/**
 * Send Notification
 */
app.post("/send-notification", async (req, res) => {
    try {
        const tokens = [...deviceTokens];

        if (tokens.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No device tokens registered",
                registeredTokens: 0,
            });
        }

        const response = await admin
            .messaging()
            .sendEachForMulticast({
                notification: {
                    title: "Notification",
                    body: "Riya agreed 😇.",
                },
                tokens,
            });

        const errors = [];

        response.responses.forEach((resp, index) => {
            if (!resp.success) {
                errors.push({
                    token: tokens[index],
                    code: resp.error?.code,
                    message: resp.error?.message,
                });

                // Remove invalid tokens automatically
                if (
                    resp.error?.code ===
                        "messaging/registration-token-not-registered" ||
                    resp.error?.code ===
                        "messaging/invalid-registration-token"
                ) {
                    deviceTokens.delete(tokens[index]);
                }
            }
        });

        res.json({
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
            errors,
        });

    } catch (error) {
        console.error("Notification Error:", error);

        res.status(500).json({
            success: false,
            error: {
                message: error.message,
                code: error.code,
                stack: error.stack,
            },
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
