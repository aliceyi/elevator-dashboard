import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export default function App() {
  const [currentFloor, setCurrentFloor] = useState(1);
  const [minFloor, setMinFloor] = useState(-1000);
  const [maxFloor, setMaxFloor] = useState(2000);
  const [isMoving, setIsMoving] = useState(false);
  const [targetFloor, setTargetFloor] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showFloorPanel, setShowFloorPanel] = useState(false);
  const [isDoorOpen, setIsDoorOpen] = useState(false);
  const [elevatorSpeed, setElevatorSpeed] = useState(2); // 1=慢速, 2=正常, 3=快速, 4=自定义
  const [currentSpeed, setCurrentSpeed] = useState(0); // 当前运行速度显示
  const [customSpeed, setCustomSpeed] = useState('30'); // 自定义速度值
  const [accelerationPhase, setAccelerationPhase] = useState('stopped'); // 'accelerating', 'cruising', 'decelerating', 'stopped'
  const [displayFloor, setDisplayFloor] = useState(1); // 显示的楼层数字（始终为整数）
  const [isSosActive, setIsSosActive] = useState(false); // SOS警报状态
  const [elevatorAnimation] = useState(new Animated.Value(0));
  const [doorAnimation] = useState(new Animated.Value(0));
  const [floorAnimation] = useState(new Animated.Value(1)); // 楼层数字动画
  const [floorInterval, setFloorInterval] = useState(null); // 楼层更新定时器
  const [atmosphericPressure, setAtmosphericPressure] = useState(101325); // 大气压，单位Pa，海平面标准大气压
  const [isPressureAlarm, setIsPressureAlarm] = useState(false); // 气压警报状态
  const [isTemperatureAlarm, setIsTemperatureAlarm] = useState(false); // 低温警报状态
  const [redLightAnimation] = useState(new Animated.Value(0)); // 红光闪烁动画

  // 初始化楼层动画值
  useEffect(() => {
    floorAnimation.setValue(currentFloor);
    setDisplayFloor(currentFloor);
  }, []);

  // 监听楼层变化，更新大气压
  useEffect(() => {
    const newPressure = calculateAtmosphericPressure(displayFloor);
    setAtmosphericPressure(newPressure);
    
    // 检查气压警报
    if (newPressure < 70000 && !isPressureAlarm && !isSosActive) {
      setIsPressureAlarm(true);
      // 启动红光闪烁动画
      startRedLightFlashing();
      Alert.alert(
        '⚠️ 气压警报',
        `当前气压过低：${formatPressureDisplay(newPressure)}\n请注意安全！`,
        [
          {
            text: '知道了',
            onPress: () => {
              setIsPressureAlarm(false);
              stopRedLightFlashing();
            }
          }
        ]
      );
    } else if (newPressure >= 70000 && isPressureAlarm) {
      setIsPressureAlarm(false);
      stopRedLightFlashing();
    }
  }, [displayFloor, isPressureAlarm, isSosActive]);

  // 监听楼层变化，检查低温警报
  useEffect(() => {
    const atmosphericLayer = getAtmosphericLayer(Math.round(displayFloor));
    if (atmosphericLayer && atmosphericLayer.temperature <= -30 && !isTemperatureAlarm && !isSosActive) {
      setIsTemperatureAlarm(true);
      Alert.alert(
        '🥶 低温警报',
        `当前温度过低：${atmosphericLayer.temperature.toFixed(1)}°C\n温度已达到危险水平，请注意保暖！`,
        [
          {
            text: '知道了',
            onPress: () => {
              setIsTemperatureAlarm(false);
            }
          }
        ]
      );
    } else if (atmosphericLayer && atmosphericLayer.temperature > -30 && isTemperatureAlarm) {
      setIsTemperatureAlarm(false);
    }
  }, [displayFloor, isTemperatureAlarm, isSosActive]);

  // 计算大气压力（根据楼层高度）
  const calculateAtmosphericPressure = (floor) => {
    // 假设每层楼高度为3米，海平面标准大气压为101325 Pa
    // 大气压随高度变化：每上升10米，气压约减少120 Pa
    const floorHeight = 3; // 每层楼高度（米）
    const heightAboveSeaLevel = floor * floorHeight;
    const pressureDecrease = heightAboveSeaLevel * 12; // 每米减少约12 Pa
    const pressure = Math.max(0, 101325 - pressureDecrease);
    return Math.round(pressure);
  };

  // 格式化楼层显示
  const formatFloorDisplay = (floor) => {
    const roundedFloor = Math.round(parseFloat(floor));
    if (roundedFloor < 0) {
      return `B${Math.abs(roundedFloor)}`;
    } else if (roundedFloor > 0) {
      return `F${roundedFloor}`;
    }
    return roundedFloor.toString();
  };

  // 格式化气压显示
  const formatPressureDisplay = (pressure) => {
    if (pressure >= 1000) {
      return `${(pressure / 1000).toFixed(2)} kPa`;
    }
    return `${pressure} Pa`;
  };

  // 根据负楼层深度计算地下岩层
  const getUndergroundLayer = (floor) => {
    if (floor >= 0) return null; // 地面以上不显示岩层
    
    const depth = Math.abs(floor);
    
    if (depth <= 3) {
      return {
        name: '表土层',
        description: '松散的土壤和有机物',
        color: '#8B4513',
        icon: '🌱'
      };
    } else if (depth <= 8) {
      return {
        name: '粘土层',
        description: '致密的粘土和砂石',
        color: '#A0522D',
        icon: '🪨'
      };
    } else if (depth <= 15) {
      return {
        name: '砂岩层',
        description: '沉积砂岩和砾石',
        color: '#CD853F',
        icon: '🏔️'
      };
    } else if (depth <= 25) {
      return {
        name: '石灰岩层',
        description: '坚硬的碳酸盐岩石',
        color: '#D2B48C',
        icon: '⛰️'
      };
    } else if (depth <= 40) {
      return {
        name: '花岗岩层',
        description: '坚硬的火成岩',
        color: '#696969',
        icon: '🗻'
      };
    } else {
      return {
        name: '基岩层',
        description: '极深的地质基岩',
        color: '#2F4F4F',
        icon: '💎'
      };
    }
  };

  // 根据海拔高度计算温度
  const calculateTemperatureByAltitude = (altitude) => {
    // 基于国际标准大气模型计算温度
    if (altitude <= 11000) {
      // 对流层：温度随高度线性下降，每1000米下降6.5°C
      return 15 - (altitude / 1000) * 6.5;
    } else if (altitude <= 20000) {
      // 平流层下部：温度保持恒定
      return -56.5;
    } else if (altitude <= 32000) {
      // 平流层上部：温度开始上升
      return -56.5 + ((altitude - 20000) / 1000) * 1;
    } else if (altitude <= 47000) {
      // 平流层顶部：温度继续上升
      return -44.5 + ((altitude - 32000) / 1000) * 2.8;
    } else if (altitude <= 85000) {
      // 中间层：温度急剧下降
      return -2.5 - ((altitude - 47000) / 1000) * 2.8;
    } else {
      // 热层：温度急剧上升
      return -86.28 + ((altitude - 85000) / 1000) * 0.5;
    }
  };

  // 根据正楼层高度计算大气层
  const getAtmosphericLayer = (floor) => {
    if (floor <= 0) return null; // 地面以下不显示大气层
    
    // 假设每层楼高度为3米，计算海拔高度
    const altitude = floor * 3; // 米
    const temperature = calculateTemperatureByAltitude(altitude);
    
    if (altitude <= 50) {
      return {
        name: '地表层',
        description: '建筑物和人类活动区域',
        color: '#4CAF50',
        icon: '🏢',
        temperature
      };
    } else if (altitude <= 500) {
      return {
        name: '低空层',
        description: '低空飞行和高层建筑区域',
        color: '#2196F3',
        icon: '🏗️',
        temperature
      };
    } else if (altitude <= 12000) {
      return {
        name: '对流层',
        description: '天气现象发生的主要区域',
        color: '#87CEEB',
        icon: '☁️',
        temperature
      };
    } else if (altitude <= 50000) {
      return {
        name: '平流层',
        description: '臭氧层所在区域，温度稳定',
        color: '#9370DB',
        icon: '🌌',
        temperature
      };
    } else if (altitude <= 85000) {
      return {
        name: '中间层',
        description: '温度最低的大气层',
        color: '#4B0082',
        icon: '❄️',
        temperature
      };
    } else if (altitude <= 600000) {
      return {
        name: '热层',
        description: '极光现象发生区域',
        color: '#FF6347',
        icon: '🌠',
        temperature
      };
    } else {
      return {
        name: '外逸层',
        description: '大气与太空的过渡区域',
        color: '#000080',
        icon: '🚀',
        temperature
      };
    }
  };

  // 启动红光闪烁动画
  const startRedLightFlashing = () => {
    const flashingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(redLightAnimation, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(redLightAnimation, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ])
    );
    flashingAnimation.start();
  };

  // 停止红光闪烁动画
  const stopRedLightFlashing = () => {
    redLightAnimation.stopAnimation();
    redLightAnimation.setValue(0);
  };

  // 生成楼层列表（跳过0层）
  const generateFloorList = (min, max) => {
    const floors = [];
    const range = max - min;
    
    // 如果范围太大，只生成部分楼层以避免性能问题
    if (range > 10000) {
      // 对于超大范围，生成当前楼层附近的楼层
      const nearbyRange = 50; // 显示当前楼层前后50层
      const start = Math.max(min, currentFloor - nearbyRange);
      const end = Math.min(max, currentFloor + nearbyRange);
      
      for (let i = start; i <= end; i++) {
        if (i !== 0) { // 跳过0层
          floors.push(i);
        }
      }
      
      // 添加边界楼层
      if (min < start && min !== 0) floors.unshift(min);
      if (max > end && max !== 0) floors.push(max);
    } else {
      // 正常范围，生成所有楼层
      for (let i = min; i <= max; i++) {
        if (i !== 0) { // 跳过0层
          floors.push(i);
        }
      }
    }
    
    return floors;
  };

  // 速度配置
  const speedConfig = {
    1: { name: '慢速', interval: 600, displaySpeed: '1.0' },
    2: { name: '正常', interval: 300, displaySpeed: '2.0' },
    3: { name: '快速', interval: 150, displaySpeed: '3.0' },
    4: { 
      name: '自定义', 
      interval: Math.max(30, Math.min(1000, 600 - (parseFloat(customSpeed) * 15))), 
      displaySpeed: customSpeed 
    }
  };

  // SOS警报功能
  const triggerSos = () => {
    setIsSosActive(!isSosActive);
    
    if (!isSosActive) {
      // 立即停止电梯运行和所有动画
      // 停止所有动画
      elevatorAnimation.stopAnimation();
      floorAnimation.stopAnimation();
      
      // 清除楼层更新定时器
      if (floorInterval) {
        clearInterval(floorInterval);
        setFloorInterval(null);
      }
      
      // 重置电梯状态
      setIsMoving(false);
      setCurrentSpeed(0);
      setAccelerationPhase('stopped');
      
      // 固定当前楼层显示，停止任何动态变化
      const fixedFloor = Math.round(displayFloor);
      setDisplayFloor(fixedFloor);
      setCurrentFloor(fixedFloor);
      
      // 重置动画值
      elevatorAnimation.setValue(0);
      floorAnimation.setValue(fixedFloor);
      
      // 启动SOS警报
      Alert.alert('🚨 SOS紧急停止', '电梯已紧急停止！\n紧急求救信号已发出！', [
        {
          text: '停止警报',
          onPress: () => setIsSosActive(false),
          style: 'destructive'
        },
        {
          text: '继续警报',
          style: 'default'
        }
      ]);
      
      // 模拟警报声音（通过震动和视觉反馈）
      playAlarmSound();
    } else {
      // 停止SOS警报
      Alert.alert('✅ 警报已停止', 'SOS警报已关闭，电梯可以正常使用');
    }
  };
  
  // 播放警报声音（模拟）
  const playAlarmSound = () => {
    // 这里可以集成真实的音频播放库，如 expo-av
    // 目前使用Alert和定时器模拟警报效果
    let alarmInterval;
    
    const startAlarm = () => {
      alarmInterval = setInterval(() => {
        // 模拟警报声音提示
        console.log('🚨 BEEP BEEP BEEP - SOS ALARM 🚨');
      }, 1000);
    };
    
    startAlarm();
    
    // 10秒后自动停止（可选）
    setTimeout(() => {
      if (alarmInterval) {
        clearInterval(alarmInterval);
      }
      if (isSosActive) {
        setIsSosActive(false);
        Alert.alert('⏰ 自动停止', 'SOS警报已自动停止');
      }
    }, 10000);
    
    // 返回清理函数
    return () => {
      if (alarmInterval) {
        clearInterval(alarmInterval);
      }
    };
  };

  // 重置电梯到初始状态
  const resetElevator = () => {
    if (isMoving) {
      Alert.alert('提示', '电梯运行中，无法重置');
      return;
    }
    setCurrentFloor(1);
    setDisplayFloor(1);
    setTargetFloor('');
    setIsDoorOpen(false);
    setCurrentSpeed(0);
    setAccelerationPhase('stopped');
    setIsSosActive(false); // 重置时关闭SOS
    setIsPressureAlarm(false); // 重置气压警报
    setIsTemperatureAlarm(false); // 重置低温警报
    stopRedLightFlashing(); // 停止红光闪烁
    setShowFloorPanel(false);
    doorAnimation.setValue(0);
    elevatorAnimation.setValue(0);
    floorAnimation.setValue(1);
    Alert.alert('重置完成', '电梯已重置到1楼');
  };

  // 电梯移动动画
  const moveElevator = (direction) => {
    if (isMoving) return;
    
    const maxSpeed = parseFloat(speedConfig[elevatorSpeed].displaySpeed);
    let floorStep = 1; // 默认每次移动1层
    
    // 根据速度决定楼层跳跃策略
    if (maxSpeed >= 30) {
      // 30千米/秒以上，奇数跳楼层 (1, 3, 5, 7, 9...)
      floorStep = 2;
    }
    // 1-30千米/秒时不跳楼层，保持默认的floorStep = 1
    
    let newFloor = direction === 'up' ? currentFloor + floorStep : currentFloor - floorStep;
    
    // 跳过0层
    if (newFloor === 0) {
      newFloor = direction === 'up' ? floorStep : -floorStep;
    }
    // 如果跳跃后经过0层，需要额外调整
    if (floorStep > 1) {
      if ((currentFloor > 0 && newFloor < 0) || (currentFloor < 0 && newFloor > 0)) {
        // 跨越0层时，需要额外跳过0层
        newFloor = direction === 'up' ? newFloor + 1 : newFloor - 1;
      }
    }
    
    if (newFloor > maxFloor || newFloor < minFloor) {
      Alert.alert('提示', `已到达${direction === 'up' ? '最高' : '最低'}楼层！`);
      return;
    }
    
    setIsMoving(true);
    setIsDoorOpen(false);
    setAccelerationPhase('accelerating');
    
    const baseInterval = speedConfig[elevatorSpeed].interval;
    
    // 单层移动的加速减速效果 - 根据速度动态调整
     const speedFactor = Math.min(maxSpeed / 10, 3); // 速度因子，最大为3
     const accelerationTime = Math.max(100, baseInterval * 0.2 * speedFactor);
     const cruisingTime = Math.max(50, baseInterval * 0.6);
     const decelerationTime = Math.max(100, baseInterval * 0.2 * speedFactor);
     
     const phases = [
       { phase: 'accelerating', speed: maxSpeed * 0.3, duration: accelerationTime },
       { phase: 'cruising', speed: maxSpeed, duration: cruisingTime },
       { phase: 'decelerating', speed: maxSpeed * 0.3, duration: decelerationTime }
     ];
    
    let phaseIndex = 0;
    
    // 初始化楼层动画
     floorAnimation.setValue(currentFloor);
     setDisplayFloor(currentFloor);
     
     const runPhase = () => {
       if (phaseIndex >= phases.length) {
         // 所有阶段完成
         setCurrentFloor(newFloor);
         setDisplayFloor(newFloor);
         setIsMoving(false);
         setCurrentSpeed(0);
         setAccelerationPhase('stopped');
         // 到达后自动开门
         setTimeout(() => {
           openDoor();
         }, 200);
         return;
       }
       
       const currentPhase = phases[phaseIndex];
       setAccelerationPhase(currentPhase.phase);
       setCurrentSpeed(parseFloat(currentPhase.speed.toFixed(1)));
       
       // 电梯移动动画
       if (phaseIndex === 0) {
         Animated.timing(elevatorAnimation, {
           toValue: direction === 'up' ? 1 : -1,
           duration: baseInterval,
           useNativeDriver: true,
         }).start(() => {
           elevatorAnimation.setValue(0);
         });
         
         // 楼层数字平滑过渡动画
         const totalPhaseDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);
         Animated.timing(floorAnimation, {
           toValue: newFloor,
           duration: totalPhaseDuration,
           useNativeDriver: false,
         }).start();
         
         // 监听动画值变化，更新显示楼层，根据速度调整精度
         const listener = floorAnimation.addListener(({ value }) => {
           // 如果SOS激活，停止更新楼层显示
           if (isSosActive) return;
           
           const speedFactor = Math.max(0.1, currentSpeed / 10); // 速度因子，最小0.1
           const timeBasedVariation = Math.sin(Date.now() * speedFactor / 200) * 0.02 * speedFactor;
           const displayValue = value + timeBasedVariation;
           setDisplayFloor(displayValue);
         });
         
         // 在动画结束时清理监听器
         setTimeout(() => {
           floorAnimation.removeListener(listener);
         }, totalPhaseDuration);
       }
       
       setTimeout(() => {
         phaseIndex++;
         runPhase();
       }, currentPhase.duration);
     };
    
    runPhase();
  };

  // 直接跳转到指定楼层
  const goToFloor = (floor = null) => {
    let targetFloorNum;
    
    if (floor !== null) {
      targetFloorNum = floor;
    } else {
      // 使用Number()替代parseInt()以支持超大数字
      targetFloorNum = Number(targetFloor);
      if (!Number.isFinite(targetFloorNum) || !Number.isInteger(targetFloorNum)) {
        Alert.alert('错误', '请输入有效的整数楼层数字');
        return;
      }
      
      // 检查是否超出JavaScript安全整数范围
      if (!Number.isSafeInteger(targetFloorNum)) {
        Alert.alert('警告', '输入的楼层数字非常大，可能会影响精度。');
        // 仍然允许继续，但给出警告
      }
    }
    
    if (targetFloorNum === 0) {
      Alert.alert('错误', '不存在0层，请选择其他楼层');
      return;
    }
    
    if (targetFloorNum > maxFloor || targetFloorNum < minFloor) {
      Alert.alert('错误', `楼层范围应在 ${formatFloorDisplay(minFloor)} 到 ${formatFloorDisplay(maxFloor)} 之间`);
      return;
    }
    
    if (targetFloorNum === currentFloor) {
      // 如果已在当前楼层，直接开门
      openDoor();
      return;
    }
    
    setIsMoving(true);
    setIsDoorOpen(false);
    setAccelerationPhase('accelerating');
    
    // 动态楼层变化动画
    const direction = targetFloorNum > currentFloor ? 1 : -1;
    const maxSpeed = parseFloat(speedConfig[elevatorSpeed].displaySpeed);
    
    // 根据速度决定楼层跳跃策略
    let floorStep = 1; // 默认每次移动1层
    if (maxSpeed >= 30) {
      // 30千米/秒以上，奇数跳楼层 (1, 3, 5, 7, 9...)
      floorStep = 2;
    }
    
    // 计算总楼层数，考虑跳过0层和楼层跳跃的情况
    let totalFloors = Math.abs(targetFloorNum - currentFloor);
    if ((currentFloor > 0 && targetFloorNum < 0) || (currentFloor < 0 && targetFloorNum > 0)) {
      totalFloors = totalFloors - 1; // 跳过0层，减少一层
    }
    
    // 如果使用楼层跳跃，调整总步数
    if (floorStep > 1) {
      totalFloors = Math.ceil(totalFloors / floorStep);
    }
    
    const baseInterval = speedConfig[elevatorSpeed].interval;
    
    let currentStep = 0;
    let currentSpeedValue = 0;
    
    // 计算加速和减速阶段的楼层数 - 根据总楼层数和速度动态调整
     const speedFactor = Math.min(maxSpeed / 5, 4); // 速度因子，影响加速减速楼层数
     const minAccelFloors = Math.max(1, Math.floor(speedFactor));
     const maxAccelFloors = Math.max(2, Math.floor(totalFloors / 4));
     
     const accelerationFloors = Math.min(maxAccelFloors, Math.max(minAccelFloors, Math.floor(totalFloors / 3)));
     const decelerationFloors = accelerationFloors;
     const cruisingFloors = Math.max(0, totalFloors - accelerationFloors - decelerationFloors);
     
     // 动态调整间隔时间，高速度时使用更短的间隔
     const dynamicInterval = Math.max(20, baseInterval / Math.max(1, maxSpeed / 5));
     
     // 初始化楼层动画值
      floorAnimation.setValue(currentFloor);
      setDisplayFloor(currentFloor);
      
      const intervalId = setInterval(() => {
        currentStep++;
        let newFloor = currentFloor + (direction * currentStep * floorStep);
        
        // 跳过0层和处理楼层跳跃
        if (floorStep > 1) {
          // 高速模式下的奇数跳楼层逻辑
          let tempFloor = currentFloor;
          for (let i = 0; i < currentStep; i++) {
            tempFloor += direction * floorStep;
            // 跳过0层
            if (tempFloor === 0) {
              tempFloor += direction * floorStep;
            }
            // 如果跨越0层，需要额外调整
            if ((tempFloor - direction * floorStep > 0 && tempFloor < 0) || 
                (tempFloor - direction * floorStep < 0 && tempFloor > 0)) {
              tempFloor += direction;
            }
          }
          newFloor = tempFloor;
        } else {
          // 普通模式下的逐层移动
          if (newFloor === 0) {
            currentStep++;
            newFloor = currentFloor + (direction * currentStep);
          }
        }
        
        // 计算当前速度和间隔
        let speedMultiplier = 1;
        if (currentStep <= accelerationFloors) {
          // 加速阶段：从0.2倍速度逐渐加速到满速
          speedMultiplier = 0.2 + (0.8 * currentStep / accelerationFloors);
          setAccelerationPhase('accelerating');
        } else if (currentStep > totalFloors - decelerationFloors) {
          // 减速阶段：从满速逐渐减速到0.2倍速度
          const decelerationStep = currentStep - (totalFloors - decelerationFloors);
          speedMultiplier = 1 - (0.8 * decelerationStep / decelerationFloors);
          setAccelerationPhase('decelerating');
        } else {
          // 巡航阶段：保持满速
          speedMultiplier = 1;
          setAccelerationPhase('cruising');
        }
        
        currentSpeedValue = maxSpeed * speedMultiplier;
        setCurrentSpeed(parseFloat(currentSpeedValue.toFixed(1)));
        
        // 平滑的楼层数字过渡动画
        const animationDuration = dynamicInterval * 0.8; // 动画时间稍短于间隔时间
        Animated.timing(floorAnimation, {
          toValue: newFloor,
          duration: animationDuration,
          useNativeDriver: false, // 因为要更新数字，不能使用原生驱动
        }).start();
        
        // 监听动画值变化，更新显示楼层，根据速度调整精度
         const listener = floorAnimation.addListener(({ value }) => {
           // 如果SOS激活，停止更新楼层显示
           if (isSosActive) return;
           
           const speedFactor = Math.max(0.1, currentSpeed / 10); // 速度因子，最小0.1
           const timeBasedVariation = Math.sin(Date.now() * speedFactor / 200) * 0.02 * speedFactor;
           const displayValue = value + timeBasedVariation;
           setDisplayFloor(displayValue);
         });
        
        setCurrentFloor(newFloor);
        
        // 到达目标楼层或最接近的楼层（在楼层跳跃模式下）
        let shouldStop = false;
        if (floorStep > 1) {
          // 高速模式下，检查是否已经到达或超过目标楼层
          if ((direction > 0 && newFloor >= targetFloorNum) || 
              (direction < 0 && newFloor <= targetFloorNum)) {
            shouldStop = true;
            // 如果超过了目标楼层，调整到最接近的可达楼层
            if (newFloor !== targetFloorNum) {
              // 在奇数跳楼层模式下，找到最接近的可达楼层
              let adjustedFloor = targetFloorNum;
              if (Math.abs(newFloor - targetFloorNum) > Math.abs((newFloor - direction * floorStep) - targetFloorNum)) {
                adjustedFloor = newFloor - direction * floorStep;
              } else {
                adjustedFloor = newFloor;
              }
              newFloor = adjustedFloor;
              setCurrentFloor(adjustedFloor);
              Alert.alert('提示', `高速模式下到达最接近楼层：${formatFloorDisplay(adjustedFloor)}`);
            }
          }
        } else {
          // 普通模式下，精确到达目标楼层
          shouldStop = (newFloor === targetFloorNum);
        }
        
        if (shouldStop) {
          clearInterval(intervalId);
          setFloorInterval(null);
          
          // 确保最终楼层数字准确显示
          setTimeout(() => {
            floorAnimation.removeListener(listener);
            const finalFloor = floorStep > 1 ? newFloor : targetFloorNum;
            setDisplayFloor(finalFloor);
            setIsMoving(false);
            setCurrentSpeed(0);
            setAccelerationPhase('stopped');
            setTargetFloor('');
            // 到达后自动开门
            setTimeout(() => {
              openDoor();
            }, 300);
          }, animationDuration);
        }
      }, dynamicInterval); // 使用动态间隔，确保高速度下的平滑过渡
      
      // 保存定时器ID到状态变量
      setFloorInterval(intervalId);
  };

  // 开门动画
  const openDoor = () => {
    setIsDoorOpen(true);
    Animated.sequence([
      Animated.timing(doorAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(doorAnimation, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsDoorOpen(false);
    });
  };

  // 手动开门
  const manualOpenDoor = () => {
    if (isMoving) {
      Alert.alert('提示', '电梯运行中无法开门');
      return;
    }
    setIsDoorOpen(true);
    Animated.timing(doorAnimation, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  // 手动关门
  const manualCloseDoor = () => {
    if (isMoving) {
      Alert.alert('提示', '电梯运行中无法关门');
      return;
    }
    if (!isDoorOpen) {
      Alert.alert('提示', '电梯门已经关闭');
      return;
    }
    Animated.timing(doorAnimation, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      setIsDoorOpen(false);
    });
  };

  // 生成楼层按钮数据
  const generateFloorButtons = () => {
    return generateFloorList(minFloor, maxFloor).reverse();
  };

  // 渲染楼层按钮
  const renderFloorButton = ({ item: floor }) => {
    const isCurrentFloor = floor === currentFloor;
    return (
      <TouchableOpacity
        style={[
          styles.floorButton,
          isCurrentFloor && styles.currentFloorButton,
          isMoving && styles.disabledButton
        ]}
        onPress={() => goToFloor(floor)}
        disabled={isMoving}
      >
        <Text style={[
          styles.floorButtonText,
          isCurrentFloor && styles.currentFloorButtonText
        ]}>
          {formatFloorDisplay(floor)}
        </Text>
      </TouchableOpacity>
    );
  };

  // 更新楼层范围
  const updateFloorRange = (newMin, newMax) => {
    // 使用更安全的数值转换，支持超大数字
    let min, max;
    
    try {
      // 先尝试作为普通数字处理
      min = Number(newMin);
      max = Number(newMax);
      
      // 检查是否为有效数字
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        Alert.alert('错误', '请输入有效的数字');
        return;
      }
      
      // 检查是否超出JavaScript安全整数范围
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
        Alert.alert('警告', '输入的数字非常大，可能会影响精度。建议使用较小的数值范围。');
        // 仍然允许继续，但给出警告
      }
    } catch (error) {
      Alert.alert('错误', '数字格式不正确');
      return;
    }
    
    if (min >= max) {
      Alert.alert('错误', '最低楼层必须小于最高楼层');
      return;
    }
    
    setMinFloor(min);
    setMaxFloor(max);
    
    // 如果当前楼层超出新范围，调整到范围内
    if (currentFloor < min) {
      setCurrentFloor(min);
    } else if (currentFloor > max) {
      setCurrentFloor(max);
    }
    
    setShowSettings(false);
    Alert.alert('成功', `楼层范围已更新为 ${formatFloorDisplay(min)} 到 ${formatFloorDisplay(max)}`);
  };

  const elevatorTransform = {
    transform: [
      {
        translateY: elevatorAnimation.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [10, 0, -10],
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* 标题栏 */}
      <View style={styles.header}>
        <Text style={styles.title}>电梯仪表盘</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowSettings(!showSettings)}
          >
            <Text style={styles.headerButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowFloorPanel(!showFloorPanel)}
          >
            <Text style={styles.headerButtonText}>🏢</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerButton, isMoving && styles.disabledButton]}
            onPress={resetElevator}
            disabled={isMoving}
          >
            <Text style={styles.headerButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 设置面板 */}
      {showSettings && (
        <View style={styles.settingsPanel}>
          <Text style={styles.settingsTitle}>楼层范围设置</Text>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>最低楼层:</Text>
            <TextInput
              style={styles.settingsInput}
              value={minFloor.toString()}
              onChangeText={(text) => {
                // 只允许输入数字和负号
                const filteredText = text.replace(/[^0-9-]/g, '');
                // 确保负号只能在开头
                const validText = filteredText.replace(/(?!^)-/g, '');
                if (validText === '' || validText === '-') {
                  return; // 不更新状态，保持当前值
                }
                const numValue = Number(validText);
                if (Number.isFinite(numValue)) {
                  setMinFloor(numValue);
                }
              }}
              keyboardType="numbers-and-punctuation"
              placeholder="-100"
            />
          </View>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>最高楼层:</Text>
            <TextInput
              style={styles.settingsInput}
              value={maxFloor.toString()}
              onChangeText={(text) => {
                // 只允许输入数字和负号
                const filteredText = text.replace(/[^0-9-]/g, '');
                // 确保负号只能在开头
                const validText = filteredText.replace(/(?!^)-/g, '');
                if (validText === '' || validText === '-') {
                  return; // 不更新状态，保持当前值
                }
                const numValue = Number(validText);
                if (Number.isFinite(numValue)) {
                  setMaxFloor(numValue);
                }
              }}
              keyboardType="numbers-and-punctuation"
              placeholder="100"
            />
          </View>
          <TouchableOpacity
            style={styles.updateButton}
            onPress={() => updateFloorRange(minFloor, maxFloor)}
          >
            <Text style={styles.updateButtonText}>更新范围</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 楼层按钮面板 */}
      {showFloorPanel && (
        <View style={styles.floorPanel}>
          <View style={styles.floorPanelHeader}>
            <Text style={styles.floorPanelTitle}>选择楼层</Text>
            <TouchableOpacity
              style={styles.closePanelButton}
              onPress={() => setShowFloorPanel(false)}
            >
              <Text style={styles.closePanelButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={generateFloorButtons()}
            renderItem={renderFloorButton}
            keyExtractor={(item) => item.toString()}
            numColumns={5}
            style={styles.floorButtonList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* 电梯显示区域 */}
      <View style={styles.elevatorContainer}>
        <View style={styles.elevatorShaft}>
          <Animated.View style={[styles.elevator, elevatorTransform]}>
            <Text style={styles.elevatorIcon}>🏢</Text>
            {/* 电梯门动画 */}
            {isDoorOpen && (
              <View style={styles.doorContainer}>
                <Animated.View style={[
                  styles.doorLeft,
                  {
                    transform: [{
                      translateX: doorAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -30],
                      })
                    }]
                  }
                ]} />
                <Animated.View style={[
                  styles.doorRight,
                  {
                    transform: [{
                      translateX: doorAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 30],
                      })
                    }]
                  }
                ]} />
              </View>
            )}
          </Animated.View>
        </View>
        
        <View style={styles.floorDisplay}>
          {/* 红光闪烁覆盖层 */}
          {isPressureAlarm && (
            <Animated.View style={[
              styles.redLightOverlay,
              {
                opacity: redLightAnimation,
              }
            ]} />
          )}
          <Text style={styles.floorLabel}>当前楼层</Text>
          <Text style={styles.floorNumber}>
            {formatFloorDisplay(displayFloor)}
          </Text>
          <Text style={styles.floorRange}>
            范围: {formatFloorDisplay(minFloor)} ~ {formatFloorDisplay(maxFloor)}
          </Text>
          {/* 大气压显示 */}
          <View style={styles.pressureContainer}>
            <Text style={styles.pressureLabel}>🌡️ 大气压</Text>
            <Text style={[styles.pressureValue, isPressureAlarm && styles.pressureAlarmText]}>
              {formatPressureDisplay(atmosphericPressure)}
            </Text>
            {isPressureAlarm && (
              <Text style={styles.pressureWarning}>⚠️ 气压过低</Text>
            )}
          </View>
          {/* 地下岩层显示 */}
          {getUndergroundLayer(Math.round(displayFloor)) && (
            <View style={styles.layerContainer}>
              <Text style={styles.layerLabel}>🌍 地质层</Text>
              <View style={styles.layerInfo}>
                <Text style={styles.layerIcon}>
                  {getUndergroundLayer(Math.round(displayFloor)).icon}
                </Text>
                <View style={styles.layerDetails}>
                  <Text style={[styles.layerName, { color: getUndergroundLayer(Math.round(displayFloor)).color }]}>
                    {getUndergroundLayer(Math.round(displayFloor)).name}
                  </Text>
                  <Text style={styles.layerDescription}>
                    {getUndergroundLayer(Math.round(displayFloor)).description}
                  </Text>
                  <Text style={styles.layerDepth}>
                    深度: {Math.abs(Math.round(displayFloor))} 层
                  </Text>
                </View>
              </View>
            </View>
          )}
          {/* 大气层显示 */}
          {getAtmosphericLayer(Math.round(displayFloor)) && (
            <View style={styles.layerContainer}>
              <Text style={styles.layerLabel}>🌤️ 大气层</Text>
              <View style={styles.layerInfo}>
                <Text style={styles.layerIcon}>
                  {getAtmosphericLayer(Math.round(displayFloor)).icon}
                </Text>
                <View style={styles.layerDetails}>
                  <Text style={[styles.layerName, { color: getAtmosphericLayer(Math.round(displayFloor)).color }]}>
                    {getAtmosphericLayer(Math.round(displayFloor)).name}
                  </Text>
                  <Text style={styles.layerDescription}>
                    {getAtmosphericLayer(Math.round(displayFloor)).description}
                  </Text>
                  <Text style={styles.layerDepth}>
                     海拔: {Math.round(displayFloor) * 3} 米 ({Math.round(displayFloor)} 层)
                   </Text>
                   <Text style={[
                     styles.layerTemperature,
                     getAtmosphericLayer(Math.round(displayFloor)).temperature <= -30 && styles.temperatureAlarmText
                   ]}>
                     🌡️ 温度: {getAtmosphericLayer(Math.round(displayFloor)).temperature.toFixed(1)}°C
                   </Text>
                   {getAtmosphericLayer(Math.round(displayFloor)).temperature <= -30 && (
                     <Text style={styles.temperatureWarning}>🥶 极低温警告</Text>
                   )}
                </View>
              </View>
            </View>
          )}
          {isDoorOpen && (
            <Text style={styles.doorStatus}>🚪 电梯门已打开</Text>
          )}
          {isMoving && (
            <View>
              <Text style={styles.speedDisplay}>速度: {currentSpeed} m/s</Text>
              <Text style={styles.phaseDisplay}>
                {accelerationPhase === 'accelerating' && '🚀 加速中'}
                {accelerationPhase === 'cruising' && '➡️ 匀速行驶'}
                {accelerationPhase === 'decelerating' && '🛑 减速中'}
              </Text>
            </View>
          )}
        </View>
      </View>
 {/* 门控制按钮 */}
      <View style={styles.doorControlsContainer}>
        <TouchableOpacity
          style={[styles.doorButton, styles.openDoorButton, (isMoving || isSosActive) && styles.disabledButton]}
          onPress={manualOpenDoor}
          disabled={isMoving || isSosActive}
        >
          <Text style={styles.doorButtonText}>🚪</Text>
          <Text style={styles.doorButtonLabel}>开门</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.doorButton, styles.closeDoorButton, (isMoving || !isDoorOpen || isSosActive) && styles.disabledButton]}
          onPress={manualCloseDoor}
          disabled={isMoving || !isDoorOpen || isSosActive}
        >
          <Text style={styles.doorButtonText}>🚪</Text>
          <Text style={styles.doorButtonLabel}>关门</Text>
        </TouchableOpacity>
      </View>
      {/* 速度选择器 */}
      <View style={styles.speedContainer}>
        <Text style={styles.speedLabel}>电梯速度:</Text>
        <View style={styles.speedButtons}>
          {Object.entries(speedConfig).slice(0, 3).map(([speed, config]) => (
            <TouchableOpacity
              key={speed}
              style={[
                styles.speedButton,
                elevatorSpeed === parseInt(speed) && styles.activeSpeedButton,
                isMoving && styles.disabledButton
              ]}
              onPress={() => setElevatorSpeed(parseInt(speed))}
              disabled={isMoving}
            >
              <Text style={[
                styles.speedButtonText,
                elevatorSpeed === parseInt(speed) && styles.activeSpeedButtonText
              ]}>
                {config.name}
              </Text>
              <Text style={[
                styles.speedValue,
                elevatorSpeed === parseInt(speed) && styles.activeSpeedValue
              ]}>
                {config.displaySpeed}m/s
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* 自定义速度 */}
        <View style={styles.customSpeedContainer}>
          <TouchableOpacity
            style={[
              styles.customSpeedButton,
              elevatorSpeed === 4 && styles.activeSpeedButton,
              isMoving && styles.disabledButton
            ]}
            onPress={() => setElevatorSpeed(4)}
            disabled={isMoving}
          >
            <Text style={[
              styles.speedButtonText,
              elevatorSpeed === 4 && styles.activeSpeedButtonText
            ]}>
              自定义
            </Text>
          </TouchableOpacity>
          <TextInput
            style={[
              styles.customSpeedInput,
              isMoving && styles.disabledButton
            ]}
            value={customSpeed}
            onChangeText={(text) => {
              // 只允许输入数字和小数点，不允许负数
              const filteredText = text.replace(/[^0-9.]/g, '');
              // 确保只有一个小数点
              const parts = filteredText.split('.');
              const finalText = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filteredText;
              setCustomSpeed(finalText);
            }}
            keyboardType="numeric"
            placeholder="30"
            placeholderTextColor="#999"
            editable={!isMoving}
          />
          <Text style={styles.customSpeedUnit}>m/s</Text>
        </View>
      </View>

      

      {/* 直达楼层 */}
      <View style={styles.directContainer}>
        <Text style={styles.directLabel}>直达楼层:</Text>
        <TextInput
          style={[styles.directInput, (isMoving || isSosActive) && styles.disabledButton]}
          value={targetFloor}
          onChangeText={(text) => {
            // 只允许输入数字和负号（楼层必须是整数）
            const filteredText = text.replace(/[^0-9-]/g, '');
            // 确保负号只能在开头
            const validText = filteredText.replace(/(?!^)-/g, '');
            setTargetFloor(validText);
          }}
          onSubmitEditing={() => goToFloor()}
          keyboardType="numbers-and-punctuation"
          placeholder={isSosActive ? "SOS激活中" : "输入楼层"}
          placeholderTextColor="#999"
          returnKeyType="go"
          blurOnSubmit={true}
          editable={!isMoving && !isSosActive}
        />
        <TouchableOpacity
          style={[styles.goButton, (isMoving || isSosActive) && styles.disabledButton]}
          onPress={() => goToFloor()}
          disabled={isMoving || isSosActive}
        >
          <Text style={styles.goButtonText}>前往</Text>
        </TouchableOpacity>
      </View>

      {/* 状态指示 */}
      {isSosActive && (
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, {color: '#FF6B00'}]}>🚨 SOS紧急停止激活</Text>
          <Text style={[styles.movingIndicator, {color: '#FF6B00'}]}>所有操作已锁定</Text>
        </View>
      )}
      
      {isMoving && !isSosActive && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>🔄 电梯运行中...</Text>
          <Text style={styles.movingIndicator}>楼层变化中</Text>
        </View>
      )}
      
      {isDoorOpen && !isMoving && !isSosActive && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>🚪 电梯门开启中...</Text>
        </View>
      )}

      {/* 控制按钮 */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, styles.upButton, (isMoving || isSosActive) && styles.disabledButton]}
          onPress={() => moveElevator('up')}
          disabled={isMoving || isSosActive}
        >
          <Text style={styles.controlButtonText}>⬆️</Text>
          <Text style={styles.controlButtonLabel}>上升</Text>
        </TouchableOpacity>
        
        {/* SOS紧急按钮 */}
        <TouchableOpacity
          style={[styles.controlButton, styles.sosButton, isSosActive && styles.activeSosButton]}
          onPress={triggerSos}
        >
          <Text style={styles.controlButtonText}>🚨</Text>
          <Text style={[styles.controlButtonLabel, isSosActive && styles.activeSosText]}>SOS</Text>
          {isSosActive && (
            <Text style={styles.sosIndicator}>紧急停止</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, styles.downButton, (isMoving || isSosActive) && styles.disabledButton]}
          onPress={() => moveElevator('down')}
          disabled={isMoving || isSosActive}
        >
          <Text style={styles.controlButtonText}>⬇️</Text>
          <Text style={styles.controlButtonLabel}>下降</Text>
        </TouchableOpacity>
      </View>

     
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 10,
    marginLeft: 5,
  },
  headerButtonText: {
    fontSize: 24,
  },
  settingsPanel: {
    backgroundColor: '#16213e',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingsLabel: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  settingsInput: {
    backgroundColor: '#0f3460',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    width: 80,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e94560',
  },
  updateButton: {
    backgroundColor: '#e94560',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  floorPanel: {
    backgroundColor: '#16213e',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0f3460',
    maxHeight: 300,
  },
  floorPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  floorPanelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closePanelButton: {
    padding: 5,
  },
  closePanelButtonText: {
    fontSize: 20,
    color: '#e94560',
    fontWeight: 'bold',
  },
  floorButtonList: {
    flex: 1,
  },
  floorButton: {
    backgroundColor: '#0f3460',
    margin: 3,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#e94560',
    flex: 1,
  },
  currentFloorButton: {
    backgroundColor: '#e94560',
    borderColor: '#fff',
  },
  floorButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  currentFloorButtonText: {
    color: '#fff',
  },
  elevatorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  elevatorShaft: {
    position: 'relative',
    marginBottom: 30,
  },
  elevator: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  elevatorIcon: {
    fontSize: 80,
  },
  doorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doorLeft: {
    width: 30,
    height: 60,
    backgroundColor: '#8B4513',
    borderRadius: 5,
    marginRight: 2,
    borderWidth: 2,
    borderColor: '#654321',
  },
  doorRight: {
    width: 30,
    height: 60,
    backgroundColor: '#8B4513',
    borderRadius: 5,
    marginLeft: 2,
    borderWidth: 2,
    borderColor: '#654321',
  },
  floorDisplay: {
    alignItems: 'center',
    backgroundColor: '#16213e',
    padding: 25,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e94560',
    minWidth: 200,
    position: 'relative',
  },
  redLightOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ff0000',
    borderRadius: 20,
    opacity: 0.1,
  },
  floorLabel: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 10,
  },
  floorNumber: {
    color: '#e94560',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  floorRange: {
    color: '#999',
    fontSize: 14,
  },
  doorStatus: {
    color: '#4CAF50',
    fontSize: 14,
    marginTop: 5,
    fontWeight: 'bold',
  },
  pressureContainer: {
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
  },
  pressureLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  pressureValue: {
    color: '#00BCD4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pressureAlarm: {
    color: '#FF5722',
    textShadowColor: '#FF5722',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  pressureAlarmText: {
    color: '#ff4444',
  },
  pressureWarning: {
    color: '#FF5722',
    fontSize: 12,
    marginTop: 2,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  layerContainer: {
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
  },
  layerLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 6,
    fontWeight: 'bold',
  },
  layerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layerIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  layerDetails: {
    alignItems: 'center',
  },
  layerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  layerDescription: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 2,
  },
  layerDepth: {
    color: '#FFA726',
    fontSize: 11,
    fontWeight: 'bold',
  },
  layerTemperature: {
    color: '#FF9800',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  temperatureAlarmText: {
    color: '#00BFFF',
    textShadowColor: '#00BFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  temperatureWarning: {
    color: '#00BFFF',
    fontSize: 10,
    marginTop: 2,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  speedDisplay: {
    color: '#FF9800',
    fontSize: 16,
    marginTop: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  phaseDisplay: {
    color: '#2196F3',
    fontSize: 14,
    marginTop: 4,
    fontWeight: 'bold',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  speedContainer: {
    backgroundColor: '#16213e',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  speedLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  speedButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  speedButton: {
    backgroundColor: '#0f3460',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e94560',
    minWidth: 80,
  },
  activeSpeedButton: {
    backgroundColor: '#e94560',
    borderColor: '#fff',
  },
  speedButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activeSpeedButtonText: {
    color: '#fff',
  },
  speedValue: {
    color: '#999',
    fontSize: 12,
  },
  activeSpeedValue: {
    color: '#fff',
    fontWeight: 'bold',
  },
  customSpeedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
  },
  customSpeedButton: {
    backgroundColor: '#0f3460',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e94560',
    marginRight: 10,
  },
  customSpeedInput: {
    backgroundColor: '#0f3460',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    width: 80,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e94560',
    marginRight: 5,
  },
  customSpeedUnit: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  controlButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  upButton: {
    backgroundColor: '#0f3460',
    borderColor: '#4CAF50',
  },
  downButton: {
    backgroundColor: '#0f3460',
    borderColor: '#FF5722',
  },
  sosButton: {
    backgroundColor: '#0f3460',
    borderColor: '#FF6B00',
  },
  activeSosButton: {
    backgroundColor: '#FF6B00',
    borderColor: '#fff',
  },
  controlButtonText: {
    fontSize: 32,
    marginBottom: 5,
  },
  controlButtonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeSosText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sosIndicator: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  directContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  directLabel: {
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
  },
  directInput: {
    flex: 1,
    backgroundColor: '#0f3460',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e94560',
  },
  goButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  statusText: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: 'bold',
  },
  movingIndicator: {
    color: '#4CAF50',
    fontSize: 14,
    marginTop: 5,
    fontStyle: 'italic',
  },
  doorControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  doorButton: {
    width: 100,
    height: 80,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  openDoorButton: {
    backgroundColor: '#0f3460',
    borderColor: '#4CAF50',
  },
  closeDoorButton: {
    backgroundColor: '#0f3460',
    borderColor: '#FF5722',
  },
  doorButtonText: {
    fontSize: 24,
    marginBottom: 5,
  },
  doorButtonLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});