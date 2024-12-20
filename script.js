// Import database functions
import { initDatabase, populateDatabase, searchEmployeesDb } from './db.js';

// Global variables
let ceoData = null;
let selectedEmployee = null;
let allEmployees = [];

// Initialize the application
async function initializeApp() {
    try {
        await initDatabase();
        setupSearch();
        await loadData();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

async function loadData() {
    try {
        console.log('Loading data...');
        const response = await fetch('organization_structure.json');
        const data = await response.json();
        console.log('Loaded JSON data:', data);
        
        ceoData = data.company.CEO;
        console.log('CEO data:', ceoData);
        
        const dbPopulated = populateDatabase(ceoData);
        if (!dbPopulated) {
            console.error('Failed to populate database');
            return;
        }
        
        updateCompanyStats(ceoData);
        renderOrgChart(ceoData);
        selectEmployee(ceoData);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const searchGuidance = document.getElementById('search-guidance');

    // Show guidance initially
    if (searchGuidance) {
        searchGuidance.style.display = 'block';
    }

    let searchTimeout = null;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Clear any pending search
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // If empty query, show guidance and clear results
        if (!query) {
            searchResults.innerHTML = '';
            if (searchGuidance) {
                searchGuidance.style.display = 'block';
            }
            return;
        }

        // Hide guidance during active search
        if (searchGuidance) {
            searchGuidance.style.display = 'none';
        }

        // Set a timeout for the search
        searchTimeout = setTimeout(() => {
            handleSearch(query, searchResults, searchGuidance);
        }, 300);
    });

    // When search input loses focus and is empty, show guidance
    searchInput.addEventListener('blur', () => {
        if (!searchInput.value.trim()) {
            searchResults.innerHTML = '';
            if (searchGuidance) {
                searchGuidance.style.display = 'block';
            }
        }
    });
}

async function handleSearch(query, searchResults, searchGuidance) {
    try {
        const results = await searchEmployeesDb(query);
        
        // Always hide guidance during active search
        if (searchGuidance) {
            searchGuidance.style.display = 'none';
        }

        if (results.length === 0) {
            // Show empty state with table structure
            searchResults.innerHTML = `
                <table class="search-results-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Team</th>
                            <th>Location</th>
                            <th>Manager</th>
                            <th>Start Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="6" class="no-results">No results found for "${query}"</td>
                        </tr>
                    </tbody>
                </table>
            `;
        } else {
            const resultsHtml = `
                <table class="search-results-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Team</th>
                            <th>Location</th>
                            <th>Manager</th>
                            <th>Start Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(employee => `
                            <tr class="search-result-row">
                                <td>
                                    <a href="#" class="employee-name-link" onclick="window.handleEmployeeClick(${employee.id}); return false;">
                                        ${employee.name || '-'}
                                    </a>
                                </td>
                                <td>${employee.role || '-'}</td>
                                <td>${employee.team || '-'}</td>
                                <td>${employee.country || '-'}</td>
                                <td>${employee.manager || '-'}</td>
                                <td>${employee.start_date || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            searchResults.innerHTML = resultsHtml;
        }
    } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = '<div class="error">Error performing search</div>';
    }
}

function selectEmployee(employeeData) {
    if (!employeeData) return;
    selectedEmployee = employeeData;
    
    // Update UI components
    updateInfoPanel(employeeData);
    updateBreadcrumb(employeeData);
    updateEmployeeStats(employeeData);
    updateTeamMembersList(employeeData);
    
    // Re-render the org chart
    renderOrgChart(ceoData);
}

function renderOrgChart(data) {
    if (!data) return;
    
    const container = document.getElementById('org-chart');
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight || 500;
    
    // Clear previous chart
    d3.select('#org-chart svg').remove();

    const svg = d3.select('#org-chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const g = svg.append('g');
    
    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 3])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
    
    svg.call(zoom);
    
    // Get the current employee to display
    const currentEmployee = selectedEmployee || data;
    
    // Create hierarchy data
    const hierarchyData = {
        name: currentEmployee.name,
        title: currentEmployee.title,
        team: currentEmployee.team,
        children: currentEmployee.direct_reports || []
    };

    const root = d3.hierarchy(hierarchyData);
    
    // Calculate layout dimensions
    const nodeWidth = 200;
    const nodeHeight = 60;
    const levelHeight = 100;
    const padding = 40;
    
    // Calculate total width needed for the tree
    const totalNodes = root.children ? root.children.length : 0;
    const totalWidth = Math.max(nodeWidth, totalNodes * nodeWidth);
    
    // Position root node
    const centerX = width / 2;
    const centerY = height * 0.5; // Position root node at 50% from the top
    
    root.x = centerX;
    root.y = centerY;
    
    // Position child nodes
    if (root.children) {
        const startX = centerX - (totalWidth / 2) + (nodeWidth / 2);
        root.children.forEach((child, i) => {
            child.x = startX + (i * nodeWidth);
            child.y = centerY + levelHeight;
        });
    }
    
    // Add links
    g.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d => {
            return `M${d.source.x},${d.source.y}
                    C${d.source.x},${(d.source.y + d.target.y) / 2}
                     ${d.target.x},${(d.source.y + d.target.y) / 2}
                     ${d.target.x},${d.target.y}`;
        });
    
    // Add nodes
    const nodes = g.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', d => {
            let classes = ['node'];
            if (d.data.name === currentEmployee.name) classes.push('highlight');
            return classes.join(' ');
        })
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .style('cursor', 'pointer')
        .on('click', function(event, d) {
            event.stopPropagation();
            const employee = findEmployeeById(d.data.id, ceoData);
            if (employee && employee !== currentEmployee) {
                selectEmployee(employee);
            }
        });
    
    // Add node backgrounds
    nodes.append('rect')
        .attr('class', 'node-bg')
        .attr('x', -90)
        .attr('y', -25)
        .attr('width', 180)
        .attr('height', 50)
        .attr('rx', 25)
        .attr('ry', 25);
    
    // Add name labels
    nodes.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-5')
        .attr('class', 'name-label')
        .text(d => d.data.name);
    
    // Add title/team labels
    nodes.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '15')
        .attr('class', 'title-label')
        .text(d => d.data.team || d.data.title || '');
    
    // Calculate the bounds of all nodes
    let bounds = {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity
    };
    
    root.descendants().forEach(d => {
        bounds.minX = Math.min(bounds.minX, d.x - 90);
        bounds.maxX = Math.max(bounds.maxX, d.x + 90);
        bounds.minY = Math.min(bounds.minY, d.y - 25);
        bounds.maxY = Math.max(bounds.maxY, d.y + 25);
    });
    
    // Add padding to bounds
    bounds.minX -= padding;
    bounds.maxX += padding;
    bounds.minY -= padding;
    bounds.maxY += padding;
    
    // Calculate the scale to fit the content
    const scale = Math.min(
        width / (bounds.maxX - bounds.minX),
        height / (bounds.maxY - bounds.minY),
        1.5
    );
    
    // Calculate translation to center the content
    const tx = (width - (bounds.maxX + bounds.minX) * scale) / 2;
    const ty = 70;
    
    // Apply the initial transform
    g.attr('transform', `translate(${tx},${ty}) scale(${scale})`);
    
    // Store the initial transform
    svg.property('__initial_transform', { x: tx, y: ty, k: scale });
    
    // Add "Go Up" button if not at root
    if (selectedEmployee && selectedEmployee !== ceoData) {
        const buttonGroup = svg.append('g')
            .attr('class', 'go-up-button')
            .attr('transform', `translate(${width - 60}, 160)`)
            .style('cursor', 'pointer')
            .on('click', () => {
                const manager = findManager(selectedEmployee.id, ceoData);
                if (manager) {
                    selectEmployee(manager);
                }
            });

        buttonGroup.append('rect')
            .attr('x', -40)
            .attr('y', -15)
            .attr('width', 80)
            .attr('height', 30)
            .attr('rx', 15)
            .attr('ry', 15)
            .attr('class', 'go-up-bg');

        buttonGroup.append('path')
            .attr('d', 'M-5,5 L0,0 L5,5')
            .attr('class', 'go-up-arrow');

        buttonGroup.append('text')
            .attr('x', 12)
            .attr('y', 5)
            .attr('class', 'go-up-text')
            .text('Up');
    }
    
    // Reset zoom transform to the calculated initial position
    zoom.transform(svg, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

function findEmployeeById(id, data = ceoData) {
    if (!data) return null;
    
    // Convert both IDs to numbers for comparison
    if (parseInt(data.id) === parseInt(id)) {
        return data;
    }
    
    // Search in direct reports
    if (data.direct_reports) {
        for (const report of data.direct_reports) {
            const found = findEmployeeById(id, report);
            if (found) return found;
        }
    }
    
    return null;
}

function findManager(employeeId, data, parent = null) {
    if (!data) return null;
    if (data.id === employeeId) return parent;
    if (data.direct_reports) {
        for (const report of data.direct_reports) {
            const found = findManager(employeeId, report, data);
            if (found !== null) return found;
        }
    }
    return null;
}

function updateInfoPanel(employee) {
    const infoPanel = document.getElementById('info-panel');
    
    // Clear previous content
    infoPanel.innerHTML = '';
    
    // Create name and title
    const nameHeader = document.createElement('h2');
    nameHeader.textContent = employee.name;
    infoPanel.appendChild(nameHeader);
    
    const titlePara = document.createElement('p');
    titlePara.className = 'title';
    titlePara.textContent = employee.title || 'N/A';
    infoPanel.appendChild(titlePara);
    
    // Create details section
    const detailsSection = document.createElement('div');
    detailsSection.className = 'info-section';
    
    const detailsTitle = document.createElement('h3');
    detailsTitle.textContent = 'Details';
    detailsSection.appendChild(detailsTitle);
    
    const teamPara = document.createElement('p');
    teamPara.innerHTML = `<strong>Team:</strong> ${employee.team || 'N/A'}`;
    detailsSection.appendChild(teamPara);
    
    const locationPara = document.createElement('p');
    locationPara.innerHTML = `<strong>Location:</strong> ${employee.country || 'N/A'}`;
    detailsSection.appendChild(locationPara);
    
    if (employee.manager) {
        const managerPara = document.createElement('p');
        const managerLabel = document.createElement('strong');
        managerLabel.textContent = 'Manager: ';
        const managerLink = document.createElement('span');
        managerLink.className = 'clickable';
        managerLink.textContent = employee.manager;
        managerLink.addEventListener('click', () => {
            const manager = findManager(employee.id, ceoData);
            if (manager) selectEmployee(manager);
        });
        managerPara.appendChild(managerLabel);
        managerPara.appendChild(managerLink);
        detailsSection.appendChild(managerPara);
    }
    
    infoPanel.appendChild(detailsSection);
    
    // Create direct reports section if there are any
    if (employee.direct_reports && employee.direct_reports.length > 0) {
        const reportsSection = document.createElement('div');
        reportsSection.className = 'info-section';
        
        const reportsTitle = document.createElement('h3');
        reportsTitle.textContent = `Direct Reports (${employee.direct_reports.length})`;
        reportsSection.appendChild(reportsTitle);
        
        const reportsList = document.createElement('ul');
        reportsList.className = 'direct-reports-list';
        
        employee.direct_reports.forEach(report => {
            const listItem = document.createElement('li');
            const reportLink = document.createElement('span');
            reportLink.className = 'clickable';
            reportLink.textContent = report.name;
            reportLink.addEventListener('click', () => selectEmployee(report));
            listItem.appendChild(reportLink);
            reportsList.appendChild(listItem);
        });
        
        reportsSection.appendChild(reportsList);
        infoPanel.appendChild(reportsSection);
    }
}

function updateBreadcrumb(employee) {
    const breadcrumb = document.getElementById('breadcrumb');
    const path = findPath(employee);
    
    breadcrumb.innerHTML = '';
    
    path.forEach((emp, index) => {
        const nameSpan = document.createElement('span');
        nameSpan.className = 'breadcrumb-item';
        nameSpan.textContent = emp.name;
        
        if (index !== path.length - 1) {
            nameSpan.addEventListener('click', () => selectEmployee(emp));
        }
        
        breadcrumb.appendChild(nameSpan);
    });
}

function findPath(targetEmployee) {
    const path = [];
    
    function findPathRecursive(node, target) {
        if (!node) return false;
        
        path.push(node);
        
        if (node.id === target.id) return true;
        
        if (node.direct_reports) {
            for (const report of node.direct_reports) {
                if (findPathRecursive(report, target)) {
                    return true;
                }
            }
        }
        
        path.pop();
        return false;
    }
    
    findPathRecursive(ceoData, targetEmployee);
    return path;
}

function updateEmployeeStats(employee) {
    const stats = countEmployeeStats(employee);
    const statsContainer = document.getElementById('employee-stats');
    
    statsContainer.innerHTML = `
        <div class="stat-item">
            <div class="stat-value">${stats.employees}</div>
            <div class="stat-label">Team Size</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${stats.teams}</div>
            <div class="stat-label">Sub-Teams</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${stats.locations}</div>
            <div class="stat-label">Team Locations</div>
        </div>
    `;
}

function countEmployeeStats(employee) {
    let teams = new Set();
    let locations = new Set();
    let employeeCount = 0;

    function traverse(node) {
        employeeCount++;
        if (node.team) teams.add(node.team);
        if (node.country) locations.add(node.country);
        
        if (node.direct_reports) {
            node.direct_reports.forEach(traverse);
        }
    }

    traverse(employee);

    return {
        employees: employeeCount,
        teams: teams.size,
        locations: locations.size
    };
}

function getAllTeamMembers(employee) {
    if (!employee) return [];
    const members = [];
    
    function traverse(node) {
        if (node.direct_reports) {
            node.direct_reports.forEach(report => {
                members.push(report);
                traverse(report);
            });
        }
    }
    
    traverse(employee);
    return members.sort((a, b) => a.name.localeCompare(b.name));
}

function updateTeamMembersList(employee) {
    const teamMembers = getAllTeamMembers(employee);
    const container = document.querySelector('.team-members-list');
    if (!container) return;
    
    container.innerHTML = teamMembers.map(member => `
        <div class="team-member" data-employee-id="${member.id}">${member.name}</div>
    `).join('');

    // Add click event listeners to all team members
    container.querySelectorAll('.team-member').forEach(element => {
        element.addEventListener('click', () => {
            const id = parseInt(element.dataset.employeeId);
            const employee = findEmployeeById(id, ceoData);
            if (employee) {
                selectEmployee(employee);
            }
        });
    });
}

function findAndSelectEmployee(id) {
    const employee = findEmployeeById(id, ceoData);
    if (employee) {
        selectEmployee(employee);
    }
}

function countTotalReports(employee) {
    let total = 0;
    if (employee.direct_reports) {
        total += employee.direct_reports.length;
        for (const report of employee.direct_reports) {
            total += countTotalReports(report);
        }
    }
    return total;
}

function updateCompanyStats(data) {
    const teams = new Set();
    const locations = new Set();
    let totalEmployees = 0;

    function traverse(node) {
        totalEmployees++;
        if (node.team) teams.add(node.team);
        if (node.country) locations.add(node.country);
        if (node.direct_reports) {
            node.direct_reports.forEach(traverse);
        }
    }

    traverse(data);

    // Update stats
    document.getElementById('total-employees').textContent = totalEmployees;
    document.getElementById('total-teams').textContent = teams.size;
    document.getElementById('total-locations').textContent = locations.size;
}

// Make handleEmployeeClick globally accessible
window.handleEmployeeClick = function(employeeId) {
    console.log('Handling employee click:', employeeId);
    
    // Convert to number if it's a string
    employeeId = parseInt(employeeId);
    
    // Find the employee in the org chart data
    const employee = findEmployeeById(employeeId, ceoData);
    console.log('Found employee:', employee);
    
    if (employee) {
        // Select the employee in the visualization
        selectEmployee(employee);
        
        // Clear search and restore initial state
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        const searchGuidance = document.getElementById('search-guidance');
        
        if (searchInput) {
            searchInput.value = '';
        }
        if (searchResults) {
            searchResults.innerHTML = '';
        }
        if (searchGuidance) {
            searchGuidance.style.display = 'block';
        }
    } else {
        console.error('Employee not found:', employeeId);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing search...');
    setupSearch();
    initializeApp().catch(error => {
        console.error('Failed to initialize app:', error);
    });
});
