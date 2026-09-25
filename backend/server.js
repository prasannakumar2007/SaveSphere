const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
    res.send("MoneyMint backend is running!");
});


// =====================================================
// TEST DATABASE
// =====================================================

app.get("/api/test-db", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT 1 AS result"
        );

        res.json({
            success: true,
            message: "Database connected successfully!",
            rows: rows
        });

    } catch (error) {
        console.error("Database connection error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed!"
        });
    }
});


// =====================================================
// REGISTER
// =====================================================

app.post("/api/register", async (req, res) => {
    try {
        const {
            full_name,
            email,
            mobile,
            password
        } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Full name, email and password are required."
            });
        }

        const [existingUsers] = await pool.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered."
            });
        }

        const passwordHash = await bcrypt.hash(
            password,
            10
        );

        const [result] = await pool.query(
            `INSERT INTO users
            (full_name, email, mobile, password_hash)
            VALUES (?, ?, ?, ?)`,
            [
                full_name,
                email,
                mobile || null,
                passwordHash
            ]
        );

        res.status(201).json({
            success: true,
            message: "Registration successful!",
            userId: result.insertId
        });

    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).json({
            success: false,
            message: "Registration failed."
        });
    }
});


// =====================================================
// LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const [users] = await pool.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const user = users[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        res.json({
            success: true,
            message: "Login successful!",
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                mobile: user.mobile
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed."
        });
    }
});


// =====================================================
// GET ALL ACTIVE SCHEMES
// =====================================================

app.get("/api/schemes", async (req, res) => {
    try {

        const [schemes] = await pool.query(
            `SELECT
                id,
                name,
                description,
                interest_rate,
                duration_months,
                minimum_amount,
                maximum_amount,
                payout_type
             FROM schemes
             WHERE status = TRUE
             ORDER BY id ASC`
        );

        res.json({
            success: true,
            schemes: schemes
        });

    } catch (error) {

        console.error("Schemes error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load savings schemes."
        });
    }
});


// =====================================================
// CREATE / ACTIVATE SAVINGS PLAN
// =====================================================

app.post("/api/savings", async (req, res) => {

    console.log("POST /api/savings received");

    try {

        const {
            user_id,
            scheme_id,
            deposited_amount,
            target_amount
        } = req.body;

        console.log("Savings request:", req.body);

        if (
            !user_id ||
            !scheme_id ||
            !deposited_amount ||
            !target_amount
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "User, scheme, deposited amount and target amount are required."
            });
        }


        // -------------------------------------------------
        // Check user
        // -------------------------------------------------

        const [users] = await pool.query(
            "SELECT id FROM users WHERE id = ?",
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }


        // -------------------------------------------------
        // Check scheme
        // -------------------------------------------------

        const [schemes] = await pool.query(
            `SELECT *
             FROM schemes
             WHERE id = ?
             AND status = TRUE`,
            [scheme_id]
        );

        if (schemes.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Savings scheme not found."
            });
        }

        const scheme = schemes[0];


        // -------------------------------------------------
        // Validate deposited amount
        // -------------------------------------------------

        const depositedAmount = Number(
            deposited_amount
        );

        const targetAmount = Number(
            target_amount
        );

        if (
            depositedAmount < Number(scheme.minimum_amount) ||
            depositedAmount > Number(scheme.maximum_amount)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    `Amount must be between ₹${scheme.minimum_amount} and ₹${scheme.maximum_amount}.`
            });
        }


        // -------------------------------------------------
        // Validate target amount
        // -------------------------------------------------

        if (targetAmount < depositedAmount) {
            return res.status(400).json({
                success: false,
                message:
                    "Target amount must be greater than or equal to the initial deposit."
            });
        }


        // -------------------------------------------------
        // Calculate dates
        // -------------------------------------------------

        const startDate = new Date();

        const maturityDate = new Date(
            startDate
        );

        maturityDate.setMonth(
            maturityDate.getMonth() +
            Number(scheme.duration_months)
        );

        const formattedStartDate =
            startDate
                .toISOString()
                .split("T")[0];

        const formattedMaturityDate =
            maturityDate
                .toISOString()
                .split("T")[0];


        // -------------------------------------------------
        // Deactivate previous active plan
        // -------------------------------------------------

        await pool.query(
            `UPDATE user_savings
             SET status = FALSE
             WHERE user_id = ?
             AND status = TRUE`,
            [user_id]
        );


        // -------------------------------------------------
        // Create new savings plan
        // -------------------------------------------------

        const [result] = await pool.query(
            `INSERT INTO user_savings
            (
                user_id,
                scheme_id,
                deposited_amount,
                target_amount,
                start_date,
                maturity_date,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
            [
                user_id,
                scheme_id,
                depositedAmount,
                targetAmount,
                formattedStartDate,
                formattedMaturityDate
            ]
        );


        console.log(
            "Savings plan created:",
            result.insertId
        );


        res.status(201).json({
            success: true,
            message:
                "Savings plan activated successfully!",
            savingsId: result.insertId
        });

    } catch (error) {

        console.error(
            "Savings creation error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to activate savings plan."
        });
    }
});


// =====================================================
// GET ACTIVE SAVINGS PLAN
// =====================================================

app.get("/api/savings/:user_id", async (req, res) => {

    console.log(
        "GET /api/savings/:user_id received:",
        req.params.user_id
    );

    try {

        const {
            user_id
        } = req.params;


        const [rows] = await pool.query(
            `SELECT
                us.id,
                us.user_id,
                us.scheme_id,
                us.deposited_amount,
                us.target_amount,
                us.start_date,
                us.maturity_date,
                us.status,

                s.name AS scheme_name,
                s.description,
                s.interest_rate,
                s.duration_months,
                s.payout_type

             FROM user_savings us

             INNER JOIN schemes s
                ON us.scheme_id = s.id

             WHERE us.user_id = ?
             AND us.status = TRUE

             ORDER BY us.id DESC

             LIMIT 1`,
            [user_id]
        );


        // -------------------------------------------------
        // No active plan
        // -------------------------------------------------

        if (rows.length === 0) {

            return res.json({
                success: true,
                hasPlan: false,
                plan: null
            });
        }


        // -------------------------------------------------
        // Calculate progress
        // -------------------------------------------------

        const plan = rows[0];

        const progress =
            (
                Number(plan.deposited_amount) /
                Number(plan.target_amount)
            ) * 100;


        res.json({
            success: true,
            hasPlan: true,

            plan: {
                ...plan,
                progress: Math.min(
                    progress,
                    100
                )
            }
        });

    } catch (error) {

        console.error(
            "Savings fetch error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to load savings plan."
        });
    }
});
// =====================================================
// CREATE PAYMENT
// =====================================================

app.post("/api/payments", async (req, res) => {
    try {
        const {
            user_id,
            savings_id,
            amount
        } = req.body;

        if (!user_id || !savings_id || !amount) {
            return res.status(400).json({
                success: false,
                message: "User, savings plan and amount are required."
            });
        }

        // Create payment as PENDING
        const [result] = await pool.query(
            `INSERT INTO payments
            (
                user_id,
                savings_id,
                amount,
                payment_status
            )
            VALUES (?, ?, ?, 'PENDING')`,
            [
                user_id,
                savings_id,
                amount
            ]
        );

        res.status(201).json({
            success: true,
            message: "Payment created successfully.",
            paymentId: result.insertId,
            status: "PENDING"
        });

    } catch (error) {
        console.error("Payment creation error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create payment."
        });
    }
});


// =====================================================
// PROCESS DEMO PAYMENT & ACTIVATE SAVINGS PLAN
// =====================================================

app.post("/api/payments/process", async (req, res) => {
    try {
        const {
            user_id,
            scheme_id,
            amount,
            target_amount,
            payment_method
        } = req.body;

        if (!user_id || !scheme_id || !amount || !target_amount) {
            return res.status(400).json({
                success: false,
                message: "User ID, Scheme ID, deposit amount, and target amount are required."
            });
        }

        const numericAmount = Number(amount);
        const numericTarget = Number(target_amount);

        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid deposit amount."
            });
        }

        if (isNaN(numericTarget) || numericTarget < numericAmount) {
            return res.status(400).json({
                success: false,
                message: "Target amount must be greater than or equal to initial deposit."
            });
        }

        // 1. Verify User exists
        const [users] = await pool.query(
            "SELECT id FROM users WHERE id = ?",
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found. Please log in again."
            });
        }

        // 2. Verify Scheme exists
        const [schemes] = await pool.query(
            "SELECT * FROM schemes WHERE id = ? AND status = TRUE",
            [scheme_id]
        );

        if (schemes.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Savings scheme not found or inactive."
            });
        }

        const scheme = schemes[0];

        // 3. Validate amounts against scheme limits
        const minAmt = Number(scheme.minimum_amount);
        const maxAmt = scheme.maximum_amount ? Number(scheme.maximum_amount) : null;

        if (numericAmount < minAmt) {
            return res.status(400).json({
                success: false,
                message: `Minimum deposit for ${scheme.name} is ₹${minAmt.toLocaleString('en-IN')}.`
            });
        }

        if (maxAmt && numericAmount > maxAmt) {
            return res.status(400).json({
                success: false,
                message: `Maximum deposit for ${scheme.name} is ₹${maxAmt.toLocaleString('en-IN')}.`
            });
        }

        // 4. Calculate maturity date
        const startDate = new Date();
        const maturityDate = new Date(startDate);
        maturityDate.setMonth(maturityDate.getMonth() + Number(scheme.duration_months));

        const formattedStartDate = startDate.toISOString().split("T")[0];
        const formattedMaturityDate = maturityDate.toISOString().split("T")[0];

        // 5. Deactivate previous active plan for this user
        await pool.query(
            `UPDATE user_savings
             SET status = FALSE
             WHERE user_id = ? AND status = TRUE`,
            [user_id]
        );

        // 6. Create new active savings plan
        const [savingsResult] = await pool.query(
            `INSERT INTO user_savings
            (user_id, scheme_id, deposited_amount, target_amount, start_date, maturity_date, status)
            VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
            [
                user_id,
                scheme_id,
                numericAmount,
                numericTarget,
                formattedStartDate,
                formattedMaturityDate
            ]
        );

        const savingsId = savingsResult.insertId;

        // 7. Generate Demo Transaction ID
        const transactionId = `MMTXN${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

        // 8. Record payment as SUCCESS in payments table
        const [paymentResult] = await pool.query(
            `INSERT INTO payments
            (user_id, savings_id, amount, payment_status, transaction_id)
            VALUES (?, ?, ?, 'SUCCESS', ?)`,
            [
                user_id,
                savingsId,
                numericAmount,
                transactionId
            ]
        );

        res.status(201).json({
            success: true,
            message: "Payment processed and savings plan activated successfully!",
            transactionId: transactionId,
            paymentId: paymentResult.insertId,
            savingsId: savingsId,
            schemeName: scheme.name,
            amount: numericAmount,
            paymentMethod: payment_method || "UPI",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Payment process error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error during payment processing."
        });
    }
});


// =====================================================
// GET USER PAYMENTS / TRANSACTIONS
// =====================================================

app.get("/api/payments/user/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;

        const [rows] = await pool.query(
            `SELECT
                p.id,
                p.user_id,
                p.savings_id,
                p.amount,
                p.payment_status,
                p.transaction_id,
                p.created_at,
                s.name AS scheme_name
             FROM payments p
             LEFT JOIN user_savings us ON p.savings_id = us.id
             LEFT JOIN schemes s ON us.scheme_id = s.id
             WHERE p.user_id = ?
             ORDER BY p.id DESC`,
            [user_id]
        );

        res.json({
            success: true,
            payments: rows
        });

    } catch (error) {
        console.error("Payments fetch error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user payment history."
        });
    }
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {

    console.log(
        `MoneyMint backend running at http://localhost:${PORT}`
    );

    console.log(
        "Savings routes loaded successfully."
    );
});