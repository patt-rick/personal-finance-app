import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

function FloatingOrb({
  size,
  color,
  startX,
  startY,
  delay,
}: {
  size: number;
  color: string;
  startX: number;
  startY: number;
  delay: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fadeIn = Animated.timing(opacity, {
      toValue: 1,
      duration: 1200,
      delay,
      useNativeDriver: true,
    });

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -12,
          duration: 3000 + delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 12,
          duration: 3000 + delay,
          useNativeDriver: true,
        }),
      ]),
    );

    fadeIn.start(() => float.start());
  }, [opacity, translateY, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

function ShimmerRing() {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1.15,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.4,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, [rotation, pulseScale, pulseOpacity]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.shimmerContainer}>
      <Animated.View
        style={[
          styles.pulseRing,
          { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
        ]}
      />
      <Animated.View
        style={[styles.shimmerRing, { transform: [{ rotate: spin }] }]}
      >
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.6)', 'transparent', 'rgba(168, 85, 247, 0.6)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
}

function LoadingBar() {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 600,
      delay: 1200,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [progress, opacity]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.6, width * 0.6],
  });

  return (
    <Animated.View style={[styles.loadingTrack, { opacity }]}>
      <Animated.View
        style={[styles.loadingBar, { transform: [{ translateX }] }]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.7)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.loadingGradient}
        />
      </Animated.View>
    </Animated.View>
  );
}

export default function SplashScreen() {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(15)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    logoOpacity,
    logoScale,
    titleOpacity,
    titleTranslateY,
    subtitleOpacity,
    subtitleTranslateY,
    footerOpacity,
  ]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#0B0F1A" />
      <LinearGradient
        colors={['#0B0F1A', '#131B2E', '#1A1040']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <FloatingOrb size={200} color="rgba(99, 102, 241, 0.06)" startX={-40} startY={height * 0.1} delay={0} />
      <FloatingOrb size={160} color="rgba(168, 85, 247, 0.05)" startX={width - 80} startY={height * 0.25} delay={400} />
      <FloatingOrb size={120} color="rgba(59, 130, 246, 0.05)" startX={width * 0.3} startY={height * 0.7} delay={800} />
      <FloatingOrb size={90} color="rgba(99, 102, 241, 0.04)" startX={width * 0.7} startY={height * 0.8} delay={200} />

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoWrapper,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <ShimmerRing />
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)']}
              style={styles.logoGlassBg}
            />
            <Image
              source={require('../icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          Finance Tracker
        </Animated.Text>

        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}
        >
          Your Premium Cashbook
        </Animated.Text>

        <LoadingBar />
      </View>

      <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
        <View style={styles.footerDivider} />
        <Text style={styles.footerText}>SECURE  ·  PRIVATE  ·  FAST</Text>
      </Animated.View>
    </View>
  );
}

const LOGO_OUTER = 140;
const LOGO_INNER = 120;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: LOGO_OUTER + 40,
    height: LOGO_OUTER + 40,
    marginBottom: 36,
  },
  shimmerContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmerRing: {
    width: LOGO_OUTER + 20,
    height: LOGO_OUTER + 20,
    borderRadius: (LOGO_OUTER + 20) / 2,
    overflow: 'hidden',
  },
  shimmerGradient: {
    flex: 1,
    borderRadius: (LOGO_OUTER + 20) / 2,
  },
  pulseRing: {
    position: 'absolute',
    width: LOGO_OUTER + 20,
    height: LOGO_OUTER + 20,
    borderRadius: (LOGO_OUTER + 20) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  logoContainer: {
    position: 'absolute',
    width: LOGO_INNER,
    height: LOGO_INNER,
    borderRadius: LOGO_INNER / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  logoGlassBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: LOGO_INNER / 2,
  },
  logoImage: {
    width: 72,
    height: 72,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 10,
    fontWeight: '400',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  loadingTrack: {
    width: width * 0.35,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 1,
    overflow: 'hidden',
    marginTop: 32,
  },
  loadingBar: {
    width: '60%',
    height: '100%',
  },
  loadingGradient: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 56,
    alignItems: 'center',
  },
  footerDivider: {
    width: 32,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 4,
    fontWeight: '300',
  },
});
