package yowyob.comops.api.infrastructure.adapter.out.persistence.mapper.security;

import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;
import yowyob.comops.api.domain.model.security.User;
import yowyob.comops.api.infrastructure.adapter.out.persistence.entity.security.UserEntity;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-02-06T11:07:08+0100",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 23 (Oracle Corporation)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public User toDomain(UserEntity entity) {
        if ( entity == null ) {
            return null;
        }

        User.UserBuilder user = User.builder();

        user.password( entity.getPasswordHash() );
        user.id( entity.getId() );
        user.organizationId( entity.getOrganizationId() );
        user.email( entity.getEmail() );
        user.firstName( entity.getFirstName() );
        user.lastName( entity.getLastName() );
        user.businessActorId( entity.getBusinessActorId() );
        if ( entity.getPlan() != null ) {
            user.plan( Enum.valueOf( User.UserPlan.class, entity.getPlan() ) );
        }
        if ( entity.getOnboardingStatus() != null ) {
            user.onboardingStatus( Enum.valueOf( User.OnboardingStatus.class, entity.getOnboardingStatus() ) );
        }
        if ( entity.getOnboardingStep() != null ) {
            user.onboardingStep( entity.getOnboardingStep() );
        }

        return user.build();
    }

    @Override
    public UserEntity toEntity(User domain) {
        if ( domain == null ) {
            return null;
        }

        UserEntity userEntity = new UserEntity();

        userEntity.setPasswordHash( domain.getPassword() );
        userEntity.setOnboardingStep( domain.getOnboardingStep() );
        userEntity.setId( domain.getId() );
        userEntity.setOrganizationId( domain.getOrganizationId() );
        userEntity.setEmail( domain.getEmail() );
        userEntity.setFirstName( domain.getFirstName() );
        userEntity.setLastName( domain.getLastName() );
        userEntity.setBusinessActorId( domain.getBusinessActorId() );
        userEntity.setActive( domain.isActive() );
        if ( domain.getPlan() != null ) {
            userEntity.setPlan( domain.getPlan().name() );
        }
        if ( domain.getOnboardingStatus() != null ) {
            userEntity.setOnboardingStatus( domain.getOnboardingStatus().name() );
        }

        return userEntity;
    }
}
