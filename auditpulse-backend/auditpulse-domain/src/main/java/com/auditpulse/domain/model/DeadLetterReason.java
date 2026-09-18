package com.auditpulse.domain.model;

/**
 * Root cause classification for quarantined messages.
 */
public enum DeadLetterReason {
    GAP_DETECTED,
    SCHEMA_VIOLATION,
    UNEXPECTED_PAYLOAD
}
