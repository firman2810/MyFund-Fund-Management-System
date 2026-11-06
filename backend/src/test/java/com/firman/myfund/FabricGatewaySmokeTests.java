package com.firman.myfund;

import io.grpc.Grpc;
import io.grpc.InsecureChannelCredentials;
import io.grpc.ManagedChannel;
import io.grpc.Status;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter;
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.hyperledger.fabric.client.Gateway;
import org.hyperledger.fabric.client.GatewayException;
import org.hyperledger.fabric.client.identity.Signers;
import org.hyperledger.fabric.client.identity.X509Identity;
import org.junit.jupiter.api.Test;

import java.math.BigInteger;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.cert.X509Certificate;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Phase 1 risk check: fabric-gateway's crypto and gRPC/Netty stack run on this JVM. No network needed. */
class FabricGatewaySmokeTests {

    @Test
    void gatewayStackLoadsSignsAndReachesTransport() throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("EC");
        gen.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair keys = gen.generateKeyPair();

        Instant now = Instant.now();
        X500Name name = new X500Name("CN=smoke");
        X509Certificate cert = new JcaX509CertificateConverter().getCertificate(
                new JcaX509v3CertificateBuilder(name, BigInteger.ONE, Date.from(now),
                        Date.from(now.plus(1, ChronoUnit.DAYS)), name, keys.getPublic())
                        .build(new JcaContentSignerBuilder("SHA256withECDSA").build(keys.getPrivate())));

        byte[] signature = Signers.newPrivateKeySigner(keys.getPrivate())
                .sign(MessageDigest.getInstance("SHA-256").digest("x".getBytes()));
        assertThat(signature).isNotEmpty();

        // Port 1 is closed: the call must travel through Netty and fail as UNAVAILABLE, not as a linkage error.
        ManagedChannel channel = Grpc.newChannelBuilder("localhost:1", InsecureChannelCredentials.create()).build();
        try (Gateway gateway = Gateway.newInstance()
                .identity(new X509Identity("SmokeMSP", cert))
                .signer(Signers.newPrivateKeySigner(keys.getPrivate()))
                .connection(channel)
                .evaluateOptions(o -> o.withDeadlineAfter(5, TimeUnit.SECONDS))
                .connect()) {
            assertThatThrownBy(() -> gateway.getNetwork("ch").getContract("cc").evaluateTransaction("Ping"))
                    .isInstanceOf(GatewayException.class)
                    .satisfies(e -> assertThat(((GatewayException) e).getStatus().getCode())
                            .isEqualTo(Status.Code.UNAVAILABLE));
        } finally {
            channel.shutdownNow().awaitTermination(5, TimeUnit.SECONDS);
        }
    }
}
