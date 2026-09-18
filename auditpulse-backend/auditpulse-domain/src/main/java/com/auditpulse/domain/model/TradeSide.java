package com.auditpulse.domain.model;

public enum TradeSide {
    BUY,
    SELL;

    public static TradeSide fromString(String side) {
        if (side == null) {
            throw new IllegalArgumentException("Side cannot be null");
        }
        return switch (side.trim().toUpperCase()) {
            case "BUY" -> BUY;
            case "SELL" -> SELL;
            default -> throw new IllegalArgumentException("Unknown trade side: " + side);
        };
    }
}
