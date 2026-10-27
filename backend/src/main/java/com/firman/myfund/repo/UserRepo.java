package com.firman.myfund.repo;

import com.firman.myfund.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepo extends JpaRepository<User, String> {
}
