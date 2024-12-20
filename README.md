# HR Organization Tool

A web application for visualizing and managing organizational structures. Built with JavaScript and SQLite, featuring an interactive org chart, advanced search capabilities, and employee information management.

## Features

- **Interactive Org Chart**: Visual representation of the organizational hierarchy
- **Advanced Search**: Complex search functionality with multiple operators
- **Employee Information**: Detailed employee profiles with role, team, and location data
- **Responsive Design**: Works seamlessly on different screen sizes

## Search Capabilities

The application supports various search operations:

### Simple Search
Just type any text to search across all fields:
```
engineering
john
uk
```

### Field-Specific Search
Use field names with operators:
- `name`: Employee's full name
- `team`: Team or department
- `location`: Office location/country
- `role`: Job title/position
- `start_date`: Employment start date

### Search Operators
- `=` Exact match (case-insensitive)
  ```
  name=John Smith
  ```
- `contains` or `like` Partial match
  ```
  role contains Engineer
  ```
- `!=` Not equal to
  ```
  location!=UK
  ```
- `>, <, >=, <=` Date comparisons
  ```
  start_date>2023-01-01
  ```

### Combined Searches
Combine multiple conditions with AND/OR:
```
team=Engineering and location=UK
role contains Manager or role contains Lead
```

## Development Setup

1. Clone the repository
2. Open `index.html` in a modern web browser
3. Load your organization data through `organization_structure.json`

## Deployment

### Local Docker Development

1. Build the container:
```bash
docker build -t hr-tool .
```

2. Run locally:
```bash
docker run -p 3000:3000 hr-tool
```

3. Access at `http://localhost:3000`

### Kubernetes Deployment

1. Push to your container registry:
```bash
docker tag hr-tool your-registry/hr-tool:latest
docker push your-registry/hr-tool:latest
```

2. Update image in `k8s/deployment.yaml` to match your registry

3. Deploy to Kubernetes:
```bash
kubectl apply -f k8s/
```

### Configuration Files

- `Dockerfile`: Container configuration
- `k8s/deployment.yaml`: Kubernetes deployment configuration
  - Resource limits
  - Health checks
  - Replica configuration
- `k8s/service.yaml`: Kubernetes service configuration
  - Port mappings
  - Service type

### Customization Options

1. Resource Allocation:
   Adjust in `k8s/deployment.yaml`:
   ```yaml
   resources:
     requests:
       memory: "64Mi"
       cpu: "100m"
     limits:
       memory: "128Mi"
       cpu: "200m"
   ```

2. Scaling:
   Modify replicas in deployment.yaml:
   ```yaml
   spec:
     replicas: 3
   ```

3. External Access:
   Change service type in `k8s/service.yaml`:
   ```yaml
   spec:
     type: LoadBalancer  # or NodePort for external access
   ```

## License

MIT License - See LICENSE file for details
