# HR Organization Chart Viewer

An interactive organization chart viewer built with D3.js that allows you to:
- Navigate through different levels of the organization
- View detailed information about each employee
- Search for employees across the organization
- View team members and direct reports
- See organization statistics

## Features
- Interactive D3.js visualization
- Breadcrumb navigation
- Employee search functionality
- Detailed employee information panel
- Team member listings
- Organization statistics

## Technologies Used
- D3.js for visualization
- Vanilla JavaScript
- CSS3 for styling
- HTML5

## Live Demo
You can view the live demo at: [GitHub Pages URL will be here]

## Local Development
1. Clone the repository
2. Open `index.html` in your browser
3. No build process required - it's all vanilla JavaScript!

## Data Format
The application expects a JSON file (`organization_structure.json`) with the following structure:
```json
{
  "name": "Employee Name",
  "title": "Job Title",
  "team": "Team Name",
  "location": "Location",
  "email": "email@example.com",
  "direct_reports": [
    {
      "name": "Direct Report Name",
      ...
    }
  ]
}
```
