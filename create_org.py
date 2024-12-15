import json
import random
from faker import Faker

# Initialize Faker to generate realistic data
fake = Faker()

# Sample name data for variety
first_names = [
    "John", "Jane", "Michael", "Emily", "David", "Sarah", "Tom", "Jessica", "Andrew", "Rachel", 
    "Daniel", "Laura", "James", "Olivia", "Ryan", "Samantha", "William", "Sophia", "Lucas", "Ava"
]
last_names = [
    "Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson", "Moore", 
    "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia"
]
countries = ["USA", "UK", "Canada", "Germany", "India", "Australia", "France", "Brazil", "Japan", "South Korea"]

# Realistic department names
departments = [
    "Engineering", "Sales", "Marketing", "HR", "Finance", "Product Management", 
    "Customer Support", "Operations", "Legal", "IT", "R&D", "Business Development"
]

# Realistic sub-department names (for teams within departments)
engineering_teams = ["Backend", "Frontend", "DevOps", "QA", "Mobile", "Infrastructure"]
sales_teams = ["North Region", "South Region", "East Region", "West Region", "Enterprise Sales"]
marketing_teams = ["Digital Marketing", "Content", "Branding", "SEO", "Public Relations"]
hr_teams = ["Talent Acquisition", "Employee Relations", "Training & Development", "Compensation & Benefits"]
finance_teams = ["Accounting", "Budgeting", "Investor Relations", "Financial Planning", "Tax"]
product_teams = ["Product Design", "Product Strategy", "User Experience", "Product Development"]
customer_support_teams = ["Technical Support", "Customer Success", "Help Desk"]
it_teams = ["Infrastructure", "Network", "Security", "IT Support"]
rnd_teams = ["Research", "Development", "Innovation", "Prototyping", "Test & Evaluation"]
legal_teams = ["Corporate Law", "Intellectual Property", "Litigation", "Compliance", "Contracts"]
operations_teams = ["Logistics", "Supply Chain", "Manufacturing", "Field Operations"]  # Added Operations teams

# Dictionary of department names to sub-teams
department_teams = {
    "Engineering": engineering_teams,
    "Sales": sales_teams,
    "Marketing": marketing_teams,
    "HR": hr_teams,
    "Finance": finance_teams,
    "Product Management": product_teams,
    "Customer Support": customer_support_teams,
    "IT": it_teams,
    "R&D": rnd_teams,
    "Legal": legal_teams,
    "Business Development": ["Strategic Partnerships", "Mergers & Acquisitions", "Global Expansion"],
    "Operations": operations_teams  # Added missing Operations department teams
}

# Function to generate a random name
def generate_name():
    first = random.choice(first_names)
    last = random.choice(last_names)
    return f"{first} {last}"

# Function to generate a realistic start date (between 2010 and 2020)
def generate_start_date():
    return f"{random.randint(2010, 2020)}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}"

# Function to generate a random employee
def create_employee(title, team, country, reports=None):
    return {
        "name": generate_name(),
        "title": title,
        "team": team,
        "country": random.choice(countries),
        "start_date": generate_start_date(),
        "direct_reports": reports if reports else []
    }

# Recursive function to generate the organization structure
def generate_organization(level=0, max_reports=7, max_depth=6, department_prefix="Department"):
    if level > max_depth:
        return []
    
    # Choose a department randomly
    department = random.choice(departments)
    
    # If the department doesn't have teams in the dictionary, skip it or assign default teams
    if department not in department_teams:
        department_teams[department] = ["Default Team"]  # Fallback to a generic team name
    
    # Pick a team from the selected department
    team_name = random.choice(department_teams[department])
    
    employees = []
    num_reports = random.randint(1, max_reports)
    
    for _ in range(num_reports):
        if level == max_depth:  # Individual Contributors at the last level
            employees.append(create_employee("Individual Contributor", team_name, random.choice(countries)))
        else:
            # Managers, Team Leads, etc., will have direct reports
            reports = generate_organization(level + 1, max_reports, max_depth, team_name)
            title = "Team Lead" if level == max_depth - 1 else "Manager"
            if level == 0:
                title = "SVP" if level == 0 else "VP"  # At the top, we'll start with SVP and VP
            employees.append(create_employee(title, team_name, random.choice(countries), reports))
    
    return employees

# Root CEO structure
def create_company_structure():
    company = {
        "company": {
            "name": "Tech Innovators Inc.",
            "CEO": create_employee("Chief Executive Officer", "Executive Leadership", "USA", generate_organization(level=1, max_reports=7, max_depth=6))
        }
    }
    return company

# Function to save the generated structure to a file
def save_to_json():
    org_structure = create_company_structure()
    with open('organization_structure.json', 'w') as f:
        json.dump(org_structure, f, indent=4)
    print("Organization structure saved to 'organization_structure.json'.")

# Function to calculate the approximate number of employees
def count_employees(organization):
    def count_reports(employee):
        return 1 + sum(count_reports(report) for report in employee['direct_reports'])
    
    return sum(count_reports(employee) for employee in organization['company']['CEO']['direct_reports'])

# Run the script
if __name__ == "__main__":
    save_to_json()

    # Optional: If you want to count employees after generating the file, you can:
    org_structure = create_company_structure()
    total_employees = count_employees(org_structure)
    print(f"Total employees generated: {total_employees}")

