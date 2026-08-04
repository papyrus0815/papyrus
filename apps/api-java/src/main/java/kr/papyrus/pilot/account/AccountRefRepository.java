package kr.papyrus.pilot.account;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRefRepository extends JpaRepository<AccountRef, String> {

	Optional<AccountRef> findByUserName(String userName);
}
