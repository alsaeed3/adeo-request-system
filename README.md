
# **AI-Powered Request Streamlining Tool**

## **Description**

### **The Problem**
Organizations often face challenges in handling internal opinion requests efficiently due to:
1. **Improper Request Formats**: Requests lack standardization, making them harder to process and understand.
2. **Time Wastage**: Employees spend excessive time clarifying, refining, or responding to unclear requests, which impacts overall productivity.

### **The Solution**
This project introduces an AI-powered tool to:
- Automate the structuring of opinion requests.
- Provide real-time feedback for improvement.
- Summarize lengthy content for concise and actionable insights.

By doing so, the tool optimizes internal workflows, reduces processing time, and enhances team productivity.

---

## **Reasoning Behind Technical Choices**

### **Technologies Used**
1. **Natural Language Processing (NLP)**: Utilized for text summarization and feedback generation.
2. **AI Models**: Leveraged for automating the structuring of requests.
3. **Frontend Framework**: A user-friendly interface for submitting, tracking, and managing requests.
4. **Backend Framework**: Ensures efficient data processing and communication between the AI model and the frontend.

### **Trade-offs**
1. **Simplified MVP Approach**: Focused on essential features (request structuring, summarization, and feedback) to deliver a functional prototype within the given timeframe.
   - **Trade-off**: Left out advanced features like integration with external task management tools (e.g., Trello, Jira).
2. **Model Complexity vs. Speed**: Chose a moderately complex AI model to ensure fast response times.
   - **Trade-off**: Sacrificed some level of sophistication in summarization for performance.
3. **Centralization vs. Scalability**: Designed the system to centralize opinion requests internally for this iteration.
   - **Trade-off**: Future iterations will address scalability for larger organizations or multiple departments.

### **What Could Be Done Differently**
1. **Integration with Collaboration Tools**: Adding integration with Slack, Teams, or task management platforms.
2. **Enhanced Feedback System**: Expanding feedback to include dynamic suggestions based on organizational standards.
3. **Data Security Enhancements**: Additional encryption layers for sensitive requests.
4. **Fine-tuning the AI Model**: Spending more time training the AI on custom datasets relevant to the organization for higher accuracy.

---

## **How to Build and Run the Project**

### **Prerequisites**
1. Python 3.8 or later.
2. Node.js and npm for the frontend.
3. Docker (optional, for containerized deployment).
4. Required libraries:
   - `transformers` (for AI models)
   - `flask` or `django` (backend framework)
   - `react` or `vue.js` (frontend framework)

### **Steps to Build and Run**
1. **Clone the Repository**  
   ```bash
   git clone https://github.com/yourrepo/projectname.git
   cd projectname
   ```

2. **Backend Setup**  
   Navigate to the `backend` folder and set up the environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python app.py
   ```

3. **Frontend Setup**  
   Navigate to the `frontend` folder and start the frontend server:
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Run the Project**
   - Open your browser and navigate to `http://localhost:3000` for the frontend.
   - The backend will be accessible at `http://localhost:5000`.

5. **(Optional) Run with Docker**
   Build and run the containerized application:
   ```bash
   docker-compose up --build
   ```

---

## **Contributors**
- [Name 1]  
- [Name 2]  
- [Name 3]  
- Abdullah Ali Abdullah Salem  

---
