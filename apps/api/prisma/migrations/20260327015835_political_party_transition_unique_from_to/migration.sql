-- RenameIndex
ALTER TABLE `political_party_transition` RENAME INDEX `uniq_party_transition_from_to` TO `political_party_transition_from_party_id_to_party_id_key`;