use ic_cdk::api::caller;
use ic_cdk::api::time;
use ic_cdk_macros::*;
use std::collections::HashMap;
use std::cell::RefCell;
use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct MedicalRecord {
    pub id: String,
    pub patient_id: Principal,
    pub record_type: String, // "diagnosis", "prescription", "lab_result"
    pub content: String,     // encrypted content in real app
    pub timestamp: u64,
    pub authorized_providers: Vec<Principal>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct RecordInput {
    pub record_type: String,
    pub content: String,
}

thread_local! {
    static RECORDS: RefCell<HashMap<String, MedicalRecord>> = RefCell::new(HashMap::new());
}

#[update]
fn add_record(input: RecordInput) -> String {
    let patient_id = caller();
    let record_id = format!("{}_{}_{}", patient_id.to_text(), input.record_type, time());
    
    let record = MedicalRecord {
        id: record_id.clone(),
        patient_id,
        record_type: input.record_type,
        content: input.content,
        timestamp: time(),
        authorized_providers: vec![],
    };

    RECORDS.with(|records| {
        records.borrow_mut().insert(record_id.clone(), record);
    });

    record_id
}

#[query]
fn get_my_records() -> Vec<MedicalRecord> {
    let patient_id = caller();
    
    RECORDS.with(|records| {
        records
            .borrow()
            .values()
            .filter(|record| record.patient_id == patient_id)
            .cloned()
            .collect()
    })
}

#[update]
fn share_with_provider(record_id: String, provider_id: Principal) -> bool {
    let patient_id = caller();
    
    RECORDS.with(|records| {
        let mut records_map = records.borrow_mut();
        
        if let Some(record) = records_map.get_mut(&record_id) {
            // Only patient can share their own records
            if record.patient_id == patient_id {
                if !record.authorized_providers.contains(&provider_id) {
                    record.authorized_providers.push(provider_id);
                }
                return true;
            }
        }
        false
    })
}

#[query]
fn get_shared_records() -> Vec<MedicalRecord> {
    let provider_id = caller();
    
    RECORDS.with(|records| {
        records
            .borrow()
            .values()
            .filter(|record| record.authorized_providers.contains(&provider_id))
            .cloned()
            .collect()
    })
}

#[update]
fn revoke_access(record_id: String, provider_id: Principal) -> bool {
    let patient_id = caller();
    
    RECORDS.with(|records| {
        let mut records_map = records.borrow_mut();
        
        if let Some(record) = records_map.get_mut(&record_id) {
            if record.patient_id == patient_id {
                record.authorized_providers.retain(|&p| p != provider_id);
                return true;
            }
        }
        false
    })
}

// Add a simple greet function to match your current Candid interface
#[query]
fn greet(name: String) -> String {
    format!("Hello, {}! Welcome to the Medical Records DApp.", name)
}

// Export the Candid interface
ic_cdk::export_candid!();