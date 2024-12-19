// Using sql.js for SQLite in browser
let SQL;
let db;
let nextEmployeeId = 1;

async function initDatabase() {
    console.log('Initializing database...');
    try {
        // Initialize sql.js
        SQL = await initSqlJs({
            locateFile: file => `https://sql.js.org/dist/${file}`
        });
        db = new SQL.Database();
        
        console.log('Database initialized.');
        
        // Create employees table with additional fields
        db.run(`
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY,
                name TEXT,
                team TEXT,
                country TEXT,
                role TEXT,
                manager_id INTEGER,
                start_date TEXT,
                data JSON,
                search_text TEXT
            );
        `);

        console.log('Employees table created.');
        
        // Create indices for common search fields
        db.run(`CREATE INDEX IF NOT EXISTS idx_search_text ON employees(search_text);`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_name ON employees(name);`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_team ON employees(team);`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_country ON employees(country);`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_start_date ON employees(start_date);`);
        
        console.log('Indices created.');
        
        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        return false;
    }
}

function assignUniqueIds(employee) {
    employee.id = nextEmployeeId++;
    if (employee.direct_reports) {
        employee.direct_reports.forEach(child => assignUniqueIds(child));
    }
    return employee;
}

function populateDatabase(employeeData) {
    try {
        // First clear any existing data
        db.run('DELETE FROM employees');
        
        function insertEmployee(employee, managerId = null) {
            const stmt = db.prepare(`
                INSERT INTO employees (id, name, team, country, role, manager_id, start_date, data, search_text)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            `);
            
            const country = employee.location || employee.country || 'Unknown';
            const employeeJson = JSON.stringify(employee);
            const searchText = `${employee.name} ${employee.team} ${country} ${employee.role || ''}`.toLowerCase();
            
            stmt.run([
                employee.id,
                employee.name,
                employee.team,
                country,
                employee.role || null,
                managerId,
                employee.start_date || '2023-01-01',
                employeeJson,
                searchText
            ]);
            
            if (employee.direct_reports) {
                employee.direct_reports.forEach(report => {
                    insertEmployee(report, employee.id);
                });
            }
        }
        
        nextEmployeeId = 1; // Reset ID counter
        const employeeDataWithIds = assignUniqueIds(employeeData);
        insertEmployee(employeeDataWithIds);
        return true;
    } catch (error) {
        console.error('Database population error:', error);
        return false;
    }
}

// Parse the query string into SQL
function parseQuery(queryStr) {
    const query = queryStr.trim().toLowerCase();
    
    try {
        const conditions = [];
        const params = [];
        
        const parts = query.split(/\s+(and|or)\s+/i);
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i].trim();
            
            if (part.toLowerCase() === 'and' || part.toLowerCase() === 'or') {
                conditions.push(part.toUpperCase());
                continue;
            }
            
            const matches = part.match(/^(\w+)(=|!=|>|<|>=|<=|like|contains)(.+)$/i);
            if (!matches) continue;
            
            let [_, field, operator, value] = matches;
            value = value.trim().replace(/^['"]|['"]$/g, '');
            
            if (field === 'location') {
                field = 'country';
            }
            
            switch (operator.toLowerCase()) {
                case '=':
                    conditions.push(`${field} = ?`);
                    params.push(value);
                    break;
                case '!=':
                    conditions.push(`${field} != ?`);
                    params.push(value);
                    break;
                case '>':
                    conditions.push(`${field} > ?`);
                    params.push(value);
                    break;
                case '<':
                    conditions.push(`${field} < ?`);
                    params.push(value);
                    break;
                case '>=':
                    conditions.push(`${field} >= ?`);
                    params.push(value);
                    break;
                case '<=':
                    conditions.push(`${field} <= ?`);
                    params.push(value);
                    break;
                case 'like':
                case 'contains':
                    conditions.push(`${field} LIKE ?`);
                    params.push(`%${value}%`);
                    break;
            }
        }
        
        if (conditions.length === 0) {
            return {
                where: 'search_text LIKE ?',
                params: [`%${query}%`]
            };
        }

        return {
            where: conditions.join(' '),
            params
        };
        
    } catch (error) {
        console.error('Query parsing error:', error);
        return {
            where: 'search_text LIKE ?',
            params: [`%${query}%`]
        };
    }
}

async function searchEmployeesDb(queryStr) {
    try {
        const { where, params } = parseQuery(queryStr);
        
        const query = `
            SELECT e.*, 
                   (SELECT name FROM employees WHERE id = e.manager_id) as manager_name
            FROM employees e
            WHERE ${where}
            ORDER BY e.name
            LIMIT 100;
        `;
        
        const stmt = db.prepare(query);
        if (params.length > 0) {
            stmt.bind(params);
        }
        
        let results = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            results.push({
                id: row.id,
                name: row.name,
                team: row.team,
                country: row.country,
                role: row.role,
                manager: row.manager_name,
                start_date: row.start_date,
                data: row.data ? JSON.parse(row.data) : {}
            });
        }
        
        stmt.free();
        return results;
        
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

export { initDatabase, populateDatabase, searchEmployeesDb };
