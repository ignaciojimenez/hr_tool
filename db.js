// Using sql.js for SQLite in browser
let SQL;
let db;

async function initDatabase() {
    try {
        // Initialize sql.js
        SQL = await initSqlJs({
            locateFile: file => `https://sql.js.org/dist/${file}`
        });
        db = new SQL.Database();
        
        // Create employees table
        db.run(`
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY,
                name TEXT,
                team TEXT,
                country TEXT,
                role TEXT,
                manager_id INTEGER,
                data JSON,
                search_text TEXT
            );
        `);

        // Create index for search
        db.run(`CREATE INDEX IF NOT EXISTS idx_search_text ON employees(search_text);`);
        
        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        return false;
    }
}

function populateDatabase(employeeData) {
    try {
        function insertEmployee(employee, managerId = null) {
            const stmt = db.prepare(`
                INSERT INTO employees (name, team, country, role, manager_id, data, search_text)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            `);
            
            const employeeJson = JSON.stringify(employee);
            const searchText = `${employee.name} ${employee.team} ${employee.country} ${employee.role || ''}`.toLowerCase();
            
            stmt.run([
                employee.name,
                employee.team,
                employee.country,
                employee.role || '',
                managerId,
                employeeJson,
                searchText
            ]);
            stmt.free();

            const employeeId = db.exec('SELECT last_insert_rowid();')[0].values[0][0];

            if (employee.direct_reports) {
                employee.direct_reports.forEach(report => {
                    insertEmployee(report, employeeId);
                });
            }
        }

        // Clear existing data
        db.run('DELETE FROM employees;');
        insertEmployee(employeeData);
        
        // Debug: Check total number of employees
        const count = db.exec('SELECT COUNT(*) FROM employees;')[0].values[0][0];
        console.log('Total employees in database:', count);
        
        return true;
    } catch (error) {
        console.error('Database population error:', error);
        return false;
    }
}

function searchEmployeesDb(query) {
    const results = [];
    let stmt = null;
    
    try {
        const searchPattern = `%${query.toLowerCase()}%`;
        console.log('Searching with pattern:', searchPattern);
        
        // First, let's see what's in the database
        const allEmployees = db.exec('SELECT name, search_text FROM employees LIMIT 5;');
        console.log('Sample employees in DB:', allEmployees);
        
        stmt = db.prepare(`
            SELECT data
            FROM employees
            WHERE search_text LIKE ?
            LIMIT 5;
        `);
        
        stmt.bind([searchPattern]);
        
        while (stmt.step()) {
            const row = stmt.getAsObject();
            results.push(JSON.parse(row.data));
        }
        
        console.log('Search results:', results);
    } catch (error) {
        console.error('Search error:', error);
    } finally {
        if (stmt) {
            stmt.free();
        }
    }
    return results;
}

export { initDatabase, populateDatabase, searchEmployeesDb };
