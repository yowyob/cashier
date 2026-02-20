package yowyob.comops.api.infrastructure.adapter.out.persistence.entity.thirdparty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Table("commerciaux")
public class SalesAgentDetailsEntity {
    @Id
    private UUID id; // Same as Tiers ID

    @Column("type_commercial")
    private String agentType;
    
    @Column("zones_couvertes")
    private String coveredZones;
    
    @Column("specialisations")
    private String specializations;
    
    private BigDecimal commission;
    
    @Column("date_debut_contrat")
    private LocalDate contractStartDate;
    
    @Column("date_fin_contrat")
    private LocalDate contractEndDate;
}
