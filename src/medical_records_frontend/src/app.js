import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';

let actor;
let agent;

// Canister ID - replace with your deployed canister ID
const canisterId = "uxrrr-q7777-77774-qaaaq-cai"; // Get this from: dfx canister id medical_records_backend

async function connect() {
    try {
        console.log('Starting connection...');
        showStatus("Connecting to ICP...", "success");
        
        // Simple test first
        console.log('Testing basic functionality...');
        console.log('HttpAgent available:', typeof HttpAgent !== 'undefined');
        console.log('Actor available:', typeof Actor !== 'undefined');
        console.log('Principal available:', typeof Principal !== 'undefined');
        
        // Create agent (in production, use Internet Identity)
        agent = new HttpAgent({ host: "http://localhost:4943" });
        console.log('Agent created');
        
        await agent.fetchRootKey(); // Only for local development
        console.log('Root key fetched');
        
        // Test with a simple IDL first
        const simpleIdlFactory = () => {
            return IDL.Service({
                'greet': IDL.Func([IDL.Text], [IDL.Text], ['query']),
            });
        };

        const testActor = await Actor.createActor(simpleIdlFactory, {
            agent,
            canisterId,
        });
        
        console.log('Test actor created, trying greet...');
        const result = await testActor.greet("test");
        console.log('Greet result:', result);
        
        // Now create the full actor
        const idlFactory = () => {
            const RecordInput = IDL.Record({
                'record_type': IDL.Text,
                'content': IDL.Text,
            });
            
            const MedicalRecord = IDL.Record({
                'id': IDL.Text,
                'patient_id': IDL.Principal,
                'record_type': IDL.Text,
                'content': IDL.Text,
                'timestamp': IDL.Nat64,
                'authorized_providers': IDL.Vec(IDL.Principal),
            });

            return IDL.Service({
                'greet': IDL.Func([IDL.Text], [IDL.Text], ['query']),
                'add_record': IDL.Func([RecordInput], [IDL.Text], []),
                'get_my_records': IDL.Func([], [IDL.Vec(MedicalRecord)], ['query']),
                'share_with_provider': IDL.Func([IDL.Text, IDL.Principal], [IDL.Bool], []),
                'get_shared_records': IDL.Func([], [IDL.Vec(MedicalRecord)], ['query']),
                'revoke_access': IDL.Func([IDL.Text, IDL.Principal], [IDL.Bool], []),
            });
        };

        actor = await Actor.createActor(idlFactory, {
            agent,
            canisterId,
        });
        
        console.log('Full actor created successfully');
        showStatus("Connected to ICP", "success");
    } catch (error) {
        console.error('Connection error:', error);
        showStatus("Connection failed: " + error.message, "error");
    }
}

async function addRecord() {
    if (!actor) {
        showStatus("Please connect first", "error");
        return;
    }

    const recordType = document.getElementById('recordType').value;
    const content = document.getElementById('content').value;

    if (!content.trim()) {
        showStatus("Please enter record content", "error");
        return;
    }

    try {
        const recordId = await actor.add_record({
            record_type: recordType,
            content: content
        });
        
        showStatus(`Record added with ID: ${recordId}`, "success");
        document.getElementById('content').value = '';
    } catch (error) {
        showStatus("Failed to add record: " + error.message, "error");
    }
}

async function loadRecords() {
    if (!actor) {
        showStatus("Please connect first", "error");
        return;
    }

    try {
        const records = await actor.get_my_records();
        displayRecords(records, 'recordsList');
        showStatus(`Loaded ${records.length} records`, "success");
    } catch (error) {
        showStatus("Failed to load records: " + error.message, "error");
    }
}

async function shareRecord() {
    if (!actor) {
        showStatus("Please connect first", "error");
        return;
    }

    const recordId = document.getElementById('shareRecordId').value;
    const providerId = document.getElementById('providerId').value;

    if (!recordId || !providerId) {
        showStatus("Please enter both record ID and provider ID", "error");
        return;
    }

    try {
        const principal = Principal.fromText(providerId);
        const success = await actor.share_with_provider(recordId, principal);
        
        if (success) {
            showStatus("Record shared successfully", "success");
        } else {
            showStatus("Failed to share record", "error");
        }
    } catch (error) {
        showStatus("Invalid provider ID or sharing failed: " + error.message, "error");
    }
}

async function loadSharedRecords() {
    if (!actor) {
        showStatus("Please connect first", "error");
        return;
    }

    try {
        const records = await actor.get_shared_records();
        displayRecords(records, 'sharedRecordsList');
        showStatus(`Loaded ${records.length} shared records`, "success");
    } catch (error) {
        showStatus("Failed to load shared records: " + error.message, "error");
    }
}

function displayRecords(records, containerId) {
    const container = document.getElementById(containerId);
    
    if (records.length === 0) {
        container.innerHTML = '<p>No records found.</p>';
        return;
    }

    container.innerHTML = records.map(record => `
        <div class="record">
            <div class="record-type">${record.record_type.toUpperCase()}</div>
            <div><strong>ID:</strong> ${record.id}</div>
            <div><strong>Content:</strong> ${record.content}</div>
            <div class="timestamp">Created: ${new Date(Number(record.timestamp) / 1000000).toLocaleString()}</div>
            <div><strong>Shared with:</strong> ${record.authorized_providers.length} providers</div>
        </div>
    `).join('');
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
}

        async function testConnection() {
            try {
                showStatus("Testing basic connection...", "success");
                console.log('Test button clicked');
                
                console.log('HttpAgent available:', typeof HttpAgent !== 'undefined');
                console.log('Actor available:', typeof Actor !== 'undefined');
                console.log('Principal available:', typeof Principal !== 'undefined');
                
                // Try to create a simple agent
                const testAgent = new HttpAgent({ host: "http://localhost:4943" });
                console.log('Test agent created');
                
                showStatus("Basic connection test successful!", "success");
            } catch (error) {
                console.error('Test error:', error);
                showStatus("Test failed: " + error.message, "error");
            }
        }

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    document.getElementById('connectBtn').addEventListener('click', connect);
    document.getElementById('addRecordBtn').addEventListener('click', addRecord);
    document.getElementById('loadRecordsBtn').addEventListener('click', loadRecords);
    document.getElementById('shareRecordBtn').addEventListener('click', shareRecord);
    document.getElementById('loadSharedRecordsBtn').addEventListener('click', loadSharedRecords);
    document.getElementById('testBtn').addEventListener('click', testConnection);
    
    console.log('Medical Records DApp initialized');
});
