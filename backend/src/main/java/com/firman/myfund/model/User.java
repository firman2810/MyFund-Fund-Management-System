package com.firman.myfund.model;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    /** The login identifier (e.g. officer.mof@mof.gov.my or an IC number). */
    @Id
    private String id;

    private String name;

    @Enumerated(EnumType.STRING)
    private Role role;

    private String organization;
    private String designation;
    private String department;
    private String password;
}
