const pool = require("./db");

async function init() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                savings_id INT NULL,
                notification_type VARCHAR(50) NOT NULL,
                title VARCHAR(150) NOT NULL,
                message TEXT NOT NULL,
                scheduled_date DATE NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                shown_date DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (savings_id) REFERENCES user_savings(id)
            )
        `);
        console.log("notifications table ready!");
        const [rows] = await pool.query("DESCRIBE notifications");
        console.log(rows);
        process.exit(0);
    } catch (err) {
        console.error("Failed to init notifications table:", err);
        process.exit(1);
    }
}

init();
