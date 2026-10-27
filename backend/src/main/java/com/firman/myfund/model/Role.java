package com.firman.myfund.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum Role {
    @JsonProperty("ministry") MINISTRY,
    @JsonProperty("agency") AGENCY,
    @JsonProperty("auditor") AUDITOR
}
