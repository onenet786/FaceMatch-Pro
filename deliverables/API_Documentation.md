# FaceMatch Pro: Rest API Specification & Documentation
This document outlines core backend endpoints available in FaceMatch Pro.

## Authentication & Session Management

### 1. Operator Log-in
Authenticate administrators, security operators, auditors, and mobile terminals.
*   **Endpoint:** `POST /api/auth/login`
*   **Request Payload:**
    ```json
    {
      "email": "mobile@facematch.pro",
      "password": "password"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "u1",
        "name": "Field Operator Qasim",
        "email": "mobile@facematch.pro",
        "role": "Mobile App User"
      }
    }
    ```

---

## Biometric Directory & Enrollment

### 2. Single Subject Biometric Registration
Enroll a new identity with baseline portrait telemetry.
*   **Endpoint:** `POST /api/persons`
*   **Headers:** `Authorization: Bearer <JWT_TOKEN>`
*   **Request Payload:**
    ```json
    {
      "name": "Amir Khan",
      "cnic": "37405-1234567-1",
      "category": "Employee",
      "profileImage": "data:image/jpeg;base64,...",
      "consentSigned": true,
      "operator": "Super Admin"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "success": true,
      "person": {
        "id": "p12345",
        "name": "Amir Khan",
        "cnic": "37405-1234567-1",
        "category": "Employee",
        "faceSampleCount": 1,
        "consentSigned": true,
        "status": "active"
      }
    }
    ```

### 3. Bulk CSV Directory Import
Inject and generate placeholder directory logs for offline registration matching.
*   **Endpoint:** `POST /api/persons/bulk-import`
*   **Headers:** `Authorization: Bearer <JWT_TOKEN>`
*   **Request Payload:**
    ```json
    {
      "records": [
        { "name": "Zafar Iqbal", "cnic": "37405-1122334-1", "category": "Employee" },
        { "name": "Hina Parveen", "cnic": "35201-9988776-2", "category": "Contractor" }
      ],
      "operator": "Super Admin"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "count": 2
    }
    ```

---

## Biometric Evaluation & Matching

### 4. Facial Matching (1:1 Verification / 1:N Identification)
Query the vector classification engine.
*   **Endpoint:** `POST /api/face/match`
*   **Headers:** `Authorization: Bearer <JWT_TOKEN>`
*   **Request Payload (1:N Identification):**
    ```json
    {
      "image": "data:image/jpeg;base64,...",
      "mode": "1:N",
      "cameraSource": "Camera Node A - Main Entrance",
      "operator": "Super Admin"
    }
    ```
*   **Success Response (1:N Match Found):**
    ```json
    {
      "log": {
        "id": "log_8921a",
        "timestamp": "2026-06-29T19:00:00Z",
        "matchedPersonName": "Amir Khan",
        "matchedPersonCategory": "Employee",
        "similarityScore": 92.4,
        "confidencePercentage": 96.0,
        "matchStatus": "Match",
        "cameraSource": "Camera Node A - Main Entrance",
        "operator": "Super Admin"
      },
      "candidates": [
        { "id": "p1", "name": "Amir Khan", "similarityScore": 92.4 },
        { "id": "p5", "name": "Muhammad Ali", "similarityScore": 54.1 }
      ]
    }
    ```

### 5. Multi-Face Bulk Matching
Detect and match multiple faces in a single group snapshot.
*   **Endpoint:** `POST /api/face/bulk-match`
*   **Headers:** `Authorization: Bearer <JWT_TOKEN>`
*   **Request Payload:**
    ```json
    {
      "image": "data:image/jpeg;base64,...",
      "cameraSource": "CCTV Group Feed - Parking East",
      "operator": "Super Admin"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "faces": [
        {
          "box": { "xmin": 120, "ymin": 45, "xmax": 210, "ymax": 150 },
          "status": "Match",
          "similarityScore": 94.0,
          "matchedPersonName": "Amir Khan",
          "category": "Employee"
        },
        {
          "box": { "xmin": 340, "ymin": 60, "xmax": 420, "ymax": 165 },
          "status": "Mismatch",
          "similarityScore": 12.0,
          "matchedPersonName": "Unknown Visitor",
          "category": "Unknown"
        }
      ]
    }
    ```
