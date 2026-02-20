package yowyob.comops.api.infrastructure.adapter.out.persistence.entity.thirdparty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Table("prospects")
public class ProspectDetailsEntity {
    @Id
    private UUID id; // Same as Tiers ID

    @Column("source_prospect")
    private String source;
    
    @Column("potentiel")
    private String potential;
    
    @Column("probabilite")
    private Integer probability;
    
    @Column("date_conversion")
    private LocalDate conversionDate;
    
    @Column("notes_prospect")
    private String notes;
}
