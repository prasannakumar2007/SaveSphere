const http = require("http");
const pool = require("./db");

function request(method, urlPath, body = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlPath, "http://localhost:5000");
        const options = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + u.search,
            method: method,
            headers: { "Content-Type": "application/json" }
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on("error", reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runE2ETests() {
    console.log("=== STARTING MONEYMINT COMPREHENSIVE E2E VERIFICATION ===");
    let passed = 0;
    let total = 0;

    function assert(cond, msg) {
        total++;
        if (cond) {
            console.log(`✓ PASS: ${msg}`);
            passed++;
        } else {
            console.error(`✗ FAIL: ${msg}`);
        }
    }

    try {
        // 1. SCHEMES MINIMUM AMOUNT TEST
        console.log("\n--- 1. Testing Schemes & Minimum Amount (₹0) ---");
        const schemesRes = await request("GET", "/api/schemes");
        assert(schemesRes.status === 200 && schemesRes.data.success, "GET /api/schemes returns 200 OK");
        assert(Array.isArray(schemesRes.data.schemes) && schemesRes.data.schemes.length === 5, "Returns exactly 5 schemes");
        
        const allMinZero = schemesRes.data.schemes.every(s => Number(s.minimum_amount) === 0);
        assert(allMinZero, "All 5 schemes have minimum_amount = ₹0 in database");

        // 2. DEMO PAYMENT & SAVINGS CREATION WITH ₹0 DEPOSIT
        console.log("\n--- 2. Testing ₹0 Demo Payment & Plan Activation ---");
        const payZeroRes = await request("POST", "/api/payments/process", {
            user_id: 1,
            scheme_id: 1,
            amount: 0,
            target_amount: 5000,
            payment_method: "UPI"
        });
        assert(payZeroRes.status === 201 && payZeroRes.data.success, "POST /api/payments/process accepts ₹0 deposit");
        assert(payZeroRes.data.transactionId && payZeroRes.data.transactionId.startsWith("MMTXN"), "Generates valid transaction ID");

        // 3. GET ACTIVE SAVINGS PLAN FOR USER 1
        console.log("\n--- 3. Testing Active Savings Plan Retrieval ---");
        const planRes = await request("GET", "/api/savings/1");
        assert(planRes.status === 200 && planRes.data.hasPlan, "GET /api/savings/1 returns active plan");
        assert(Number(planRes.data.plan.deposited_amount) === 0, "Active plan reflects deposited_amount = 0");

        // 4. DEMO PAYMENT & SAVINGS CREATION WITH POSITIVE DEPOSIT (₹500)
        console.log("\n--- 4. Testing Positive Amount Payment & Plan Update ---");
        const payPosRes = await request("POST", "/api/payments/process", {
            user_id: 1,
            scheme_id: 2,
            amount: 500,
            target_amount: 10000,
            payment_method: "CARD"
        });
        assert(payPosRes.status === 201 && payPosRes.data.success, "POST /api/payments/process accepts ₹500 deposit");

        // 5. NOTIFICATION SYSTEM & DATE LOGIC TEST (2 DAYS REMAINING)
        console.log("\n--- 5. Testing Notification Engine & Date Calculation ---");
        // Clear previous notifications for test user 1
        await pool.query("DELETE FROM notifications WHERE user_id = 1");
        // Set plan maturity date to 2 days from now for User 1
        await pool.query("UPDATE user_savings SET maturity_date = DATE_ADD(CURDATE(), INTERVAL 2 DAY) WHERE user_id = 1 AND status = TRUE");
        
        const notifRes1 = await request("GET", "/api/notifications/1");
        assert(notifRes1.status === 200 && notifRes1.data.success, "GET /api/notifications/1 succeeds");
        assert(notifRes1.data.notifications.length > 0, "Generates notification for plan 2 days away");
        
        const popupNotif = notifRes1.data.popupNotification;
        assert(popupNotif !== null, "Returns popupNotification candidate for initial visit");
        assert(popupNotif && popupNotif.message.includes("is due in 2 days"), "Notification text correctly states 'is due in 2 days.'");

        // Dismiss popup test (no endless popups on same day refresh)
        if (popupNotif) {
            const dismissRes = await request("POST", `/api/notifications/${popupNotif.id}/dismiss`);
            assert(dismissRes.status === 200 && dismissRes.data.success, "POST /api/notifications/:id/dismiss succeeds");

            const notifRes2 = await request("GET", "/api/notifications/1");
            assert(notifRes2.data.popupNotification === null, "Refreshed fetch returns popupNotification = null (no duplicate popups on same day)");
            assert(notifRes2.data.unreadCount >= 1, "Unread badge count maintained in bell panel");
        }

        // Mark notification as read
        if (popupNotif) {
            const readRes = await request("POST", `/api/notifications/${popupNotif.id}/read`);
            assert(readRes.status === 200 && readRes.data.success, "POST /api/notifications/:id/read succeeds");
            
            const notifRes3 = await request("GET", "/api/notifications/1");
            assert(notifRes3.data.unreadCount === 0, "Unread count updated to 0 after marking as read");
        }

        // 6. SUMMARY
        console.log(`\n=== TEST SUMMARY: ${passed}/${total} TESTS PASSED ===\n`);
        process.exit(passed === total ? 0 : 1);

    } catch (err) {
        console.error("Test execution error:", err);
        process.exit(1);
    }
}

runE2ETests();
