# Firestore Security Specification & Red Team Test Suite

## 1. Data Invariants
1. **User Profiles (`users`)**:
   - Only authenticated users can write/register their own profile.
   - Users cannot update their own `role` or `status` fields to prevent self-assigned privileges or bypassing suspension.
   - Profile `uid` must match the authenticated `request.auth.uid`.

2. **Service Requests (`requests`)**:
   - Must be authenticated to submit or read requests.
   - All standard users can create requests. The `createdBy` field must match `request.auth.uid`.
   - Creation requires `createdAt` and `updatedAt` to equal `request.time`.
   - Update permissions are tiered:
     - Only HOD, Production Managers, Admins, or Super Admins can update approval fields (`hodStatus`, `prodStatus`).
     - Only assigned technicians or managers can update technician fields (`technicianComments`, `status`).
     - Standard users can only cancel/edit their own requests prior to approval.
   - Terminal status rules prevent modifications once status is set to Completed, Cancelled, or Rejected, except by Super Admins.

3. **Global Settings (`settings`)**:
   - Only Super Admin or Admin can write or update.
   - Read is open to all signed-in users.

4. **Audit and Activity Logs (`admin_logs`, `user_logs`, `login_logs`, `audit_trail`)**:
   - Write-only by authenticated sessions under strict validation rules.
   - No deletion or updates allowed under any circumstances (immutable records).

5. **Departments & Machines (`departments`, `machines`)**:
   - Read-only by signed-in users.
   - Write/Edit/Delete only by Admin/Super Admin.

---

## 2. The "Dirty Dozen" Malicious Payloads

### Payload 1: Privilege Escalation (Self-Assigned Admin Role)
* **Target Path**: `/users/attacker_uid`
* **Vulnerability**: Attacker attempts to register a profile setting their own role to 'Super Admin'.
* **Payload**:
```json
{
  "uid": "attacker_uid",
  "name": "Malicious User",
  "email": "attacker@evil.com",
  "phone": "+123456",
  "department": "Production",
  "role": "Super Admin",
  "status": "Active",
  "createdAt": "2026-07-16T00:00:00Z",
  "updatedAt": "2026-07-16T00:00:00Z"
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 2: Profile Impersonation / Identity Hijack
* **Target Path**: `/users/victim_uid`
* **Vulnerability**: Authenticated attacker attempts to write or update another user's profile.
* **Payload**:
```json
{
  "uid": "victim_uid",
  "name": "Victim User",
  "email": "victim@company.com",
  "phone": "+123456",
  "department": "Production",
  "role": "Department User",
  "status": "Active"
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 3: Request Creator Impersonation (Spoofing `createdBy`)
* **Target Path**: `/requests/req_123`
* **Vulnerability**: Authenticated user submits a ticket but spoof-sets `createdBy` to a different user's UID to frame them or leak data.
* **Payload**:
```json
{
  "requestNo": "REQ-2026-0001",
  "title": "Broken Machine",
  "description": "Needs immediate fix",
  "createdBy": "victim_uid",
  "createdByEmail": "victim@company.com",
  "createdByName": "Victim Name"
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 4: Arbitrary ID Path Poisoning Attack
* **Target Path**: `/requests/VERY_LONG_GARBAGE_CHARACTER_ID_THAT_EXCEEDS_RESOURCE_LIMITS_FOR_DENIAL_OF_WALLET_ATTACK_3748297493274932847`
* **Vulnerability**: Inject massive, malformed document ID to blow up index lookup costs.
* **Expected Result**: `PERMISSION_DENIED`

### Payload 5: Log Forgery & Manipulation (Deleting Audit Trails)
* **Target Path**: `/audit_trail/log_abc`
* **Vulnerability**: Malicious technician attempts to delete their activity trail or logs to cover tracks.
* **Expected Result**: `PERMISSION_DENIED`

### Payload 6: System Configuration Overwrite by Standard User
* **Target Path**: `/settings/global`
* **Vulnerability**: Non-admin user attempts to overwrite company-wide app settings or turn off self-registration.
* **Payload**:
```json
{
  "appName": "Hacked Portal",
  "allowSelfRegistration": true
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 7: Terminal State Status Alteration (Updating Completed Tickets)
* **Target Path**: `/requests/completed_ticket_id`
* **Vulnerability**: Non-admin attempts to re-open, edit, or manipulate a ticket that is already 'Completed'.
* **Payload**:
```json
{
  "status": "In Progress",
  "description": "Tampered description on locked ticket"
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 8: Direct HOD Status Self-Approval
* **Target Path**: `/requests/pending_ticket_id`
* **Vulnerability**: Standard Department User attempts to approve their own request by modifying `hodStatus` directly.
* **Payload**:
```json
{
  "hodStatus": "Approved",
  "hodComments": "Approved myself"
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 9: Client-Side Timestamp Spoofing (Backdating Requests)
* **Target Path**: `/requests/new_ticket_id`
* **Vulnerability**: Submitting a request with client-supplied backdated `createdAt` timestamp to game SLAs.
* **Payload**:
```json
{
  "createdAt": "2020-01-01T00:00:00Z"
}
```
* **Expected Result**: `PERMISSION_DENIED` (must equal `request.time`)

### Payload 10: Department Collection Hijack
* **Target Path**: `/departments/dept_new`
* **Vulnerability**: Standard department user tries to insert a fake department or delete an existing one.
* **Payload**:
```json
{
  "name": "Evil Hacking Group",
  "code": "EVIL"
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 11: Machine Collection Hijack
* **Target Path**: `/machines/machine_abc`
* **Vulnerability**: Non-admin tries to modify/delete factory machine status to trigger false alerts.
* **Payload**:
```json
{
  "status": "Maintenance"
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 12: Notification Hijack (Spamming other users)
* **Target Path**: `/notifications/notif_xyz`
* **Vulnerability**: Injecting random notifications with malicious links directly into another user's inbox.
* **Payload**:
```json
{
  "uid": "victim_uid",
  "message": "Click this link: http://malicious.com"
}
```
* **Expected Result**: `PERMISSION_DENIED`
