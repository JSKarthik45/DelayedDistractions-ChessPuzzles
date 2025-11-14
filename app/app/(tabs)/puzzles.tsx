import React, { useCallback, useMemo, useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, StatusBar, StyleSheet, View, PixelRatio, Text, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { TapGestureHandler } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chess, type Square, type Move } from "chess.js";

const GREEN = "#739552" as const;
const BEIGE = "#ebecd0" as const;
const BOARD_SIZE = 8;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type LastMove = { from: Square; to: Square };
type MoveSpec = { from: Square; to: Square; promotion?: 'q'|'r'|'b'|'n' };
type BoardModel = {
  id: string;
  chess: Chess;
  liked: boolean;
  starred: boolean;
  version: number;
  tactic: string;
  sideToPlay: 'w' | 'b';
  lastMove?: LastMove;
  solution: MoveSpec[];
  stepIndex: number;
  solved: boolean;
  correctSquares: Square[];
  lastMoveCorrect?: boolean; // true correct, false incorrect, undefined = none yet
};

// Hard-coded list of 10 boards with tactic and fixed side-to-move (independent of FEN)
const PRESET_PUZZLES: { fen: string; tactic: string; sideToPlay: 'w' | 'b'; solution: MoveSpec[] }[] = [
  {
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    tactic: "Double Attack",
    sideToPlay: 'w',
    solution: [{ from: 'e2', to: 'e4' }],
  },
  {
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
    tactic: "Pin",
    sideToPlay: 'b',
    solution: [{ from: 'e7', to: 'e5' }],
  },
  {
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 2 3",
    tactic: "Fork",
    sideToPlay: 'w',
    solution: [
      { from: 'd4', to: 'e5' },
      { from: 'f3', to: 'd4' }
    ],
  },
  {
    fen: "rnbqk2r/ppp2ppp/3b1n2/3pp3/3P4/2P1PN2/PP1N1PPP/R1BQKB1R w KQkq - 0 6",
    tactic: "Skewer",
    sideToPlay: 'w',
    solution: [{ from: 'd1', to: 'b3' }],
  },
  {
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/3P4/2N5/PPP1PPPP/R1BQKBNR b KQkq - 1 3",
    tactic: "Discovered Attack",
    sideToPlay: 'b',
    solution: [{ from: 'c6', to: 'd4' }],
  },
  {
    fen: "rnbq1rk1/ppp2ppp/3b1n2/3pp3/3P4/2P1PN2/PP1N1PPP/R1BQ1RK1 w - - 2 8",
    tactic: "Back Rank Mate",
    sideToPlay: 'w',
    solution: [{ from: 'd1', to: 'd8' }],
  },
  {
    fen: "r1bqk2r/ppp2ppp/2nb1n2/3pp3/3P4/2P1PN2/PP1N1PPP/R1BQKB1R b KQkq - 2 6",
    tactic: "Smothered Mate",
    sideToPlay: 'b',
    solution: [
      { from: 'e8', to: 'g8' },
      { from: 'g8', to: 'h8' }
    ],
  },
  {
    fen: "r1bqk2r/ppp2ppp/2nb1n2/3pp3/3P4/2P1PN2/PP1N1PPP/R1BQKB1R w KQkq - 3 7",
    tactic: "Queen Sacrifice",
    sideToPlay: 'w',
    solution: [{ from: 'd1', to: 'h5' }],
  },
  {
    fen: "rnbqk2r/ppp2ppp/3b1n2/3pp3/3P4/2P1PN2/PP1N1PPP/R1BQKB1R w KQkq - 0 6",
    tactic: "Deflection",
    sideToPlay: 'w',
    solution: [{ from: 'c3', to: 'd4' }],
  },
  {
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/3P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 2 3",
    tactic: "Overloading",
    sideToPlay: 'w',
    solution: [{ from: 'c3', to: 'd5' }],
  }
];

function createBoardFromPreset(p: { fen: string; tactic: string; sideToPlay: 'w' | 'b'; solution: MoveSpec[] }, id: string): BoardModel {
  const chess = new Chess();
  try { chess.load(p.fen); } catch {}
  return { id, chess, liked: false, starred: false, version: 0, tactic: p.tactic, sideToPlay: p.sideToPlay, solution: p.solution, stepIndex: 0, solved: false, correctSquares: [] };
}

function useBoards(initial = 2) {
  const [boards, setBoards] = useState<BoardModel[]>(() =>
    Array.from({ length: initial }, (_, i) => createBoardFromPreset(PRESET_PUZZLES[i % PRESET_PUZZLES.length], `b-${i}`))
  );
  const loadingRef = useRef(false);
  const cursorRef = useRef<number>(initial);
  const addBoard = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setTimeout(() => {
      setBoards((prev) => {
        const idx = cursorRef.current % PRESET_PUZZLES.length;
        const next = createBoardFromPreset(PRESET_PUZZLES[idx], `b-${prev.length}`);
        cursorRef.current += 1;
        return [...prev, next];
      });
      loadingRef.current = false;
    }, 5);
  }, []);
  return { boards, addBoard, setBoards };
}

function Board({ model, size, onMovePlayed }: { model: BoardModel; size: number; onMovePlayed: (id: string, last: LastMove, isCapture: boolean) => void }) {
  // Align squares to device pixels to avoid hairline seams and color blending that can distort perceived colors
  const ratio = PixelRatio.get();
  const rawSquare = size / BOARD_SIZE;
  const square = Math.floor(rawSquare * ratio) / ratio; // pixel-aligned
  const boardSide = square * BOARD_SIZE; // exact 8x8 fit without wrap

  const [selected, setSelected] = useState<Square | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [, force] = useState(0); // simple re-render trigger after moves

  type PieceLetter = "p" | "r" | "n" | "b" | "q" | "k";
  const iconName = (t: string): any => {
    const map: Record<PieceLetter, string> = {
      p: "chess-pawn",
      r: "chess-rook",
      n: "chess-knight",
      b: "chess-bishop",
      q: "chess-queen",
      k: "chess-king",
    };
    return map[t as PieceLetter];
  };

  // Be resilient if model or its chess instance is absent (e.g., during HMR)
  const fallbackRef = useRef<Chess>(new Chess());
  const chess = (model && model.chess) ? model.chess : fallbackRef.current;

  const toSquare = (r: number, c: number): Square => {
    const file = String.fromCharCode("a".charCodeAt(0) + c);
    const rank = (8 - r).toString();
    return (file + rank) as Square;
  };

  const isMoveTarget = (sq: Square) => moves.some((m) => m.to === sq);
  const moveForTarget = (sq: Square) => moves.find((m) => m.to === sq);

  const onSquarePress = (r: number, c: number) => {
    const sq = toSquare(r, c);
    const piece = chess.get(sq);
    if (!selected) {
      if (piece && piece.color === chess.turn()) {
        setSelected(sq);
        let legal: Move[] = [];
        try {
          legal = chess.moves({ square: sq, verbose: true }) as Move[];
        } catch {}
        setMoves(legal);
      }
      return;
    }

    // if tapping same square, deselect
    if (sq === selected) {
      setSelected(null);
      setMoves([]);
      return;
    }

    // try to move if it's a legal destination
    const mv = moveForTarget(sq);
    if (mv) {
      // default promote to queen for simplicity
      const played = chess.move({ from: mv.from, to: mv.to, promotion: "q" }) as Move | null;
      setSelected(null);
      setMoves([]);
      force((v) => v + 1);
      if (played) onMovePlayed(model.id, { from: played.from as Square, to: played.to as Square }, (played.flags.includes('c') || played.flags.includes('e')));
      return;
    }

    // otherwise, change selection if tapping own piece
    if (piece && piece.color === chess.turn()) {
      setSelected(sq);
      let legal: Move[] = [];
      try {
        legal = chess.moves({ square: sq, verbose: true }) as Move[];
      } catch {}
      setMoves(legal);
    } else {
      setSelected(null);
      setMoves([]);
    }
  };

  return (
    <View style={styles.boardFrame}>
      <View style={{ width: boardSide, height: boardSide, flexDirection: "row", flexWrap: "wrap", backgroundColor: BEIGE }}>
        {Array.from({ length: BOARD_SIZE }).map((_, r) =>
          Array.from({ length: BOARD_SIZE }).map((__, c) => {
            const isDark = (r + c) % 2 === 0;
            const bg = isDark ? BEIGE : GREEN;
            const sq = toSquare(r, c);
            const p = chess.get(sq) as any | null;
            const selectedHere = selected === sq;
            const target = isMoveTarget(sq);
            const mv = target ? (moveForTarget(sq) as Move) : null;
            const isCapture = mv ? (mv.flags.includes("c") || mv.flags.includes("e")) : false;
            return (
              <Pressable key={`${r}-${c}`} onPress={() => onSquarePress(r, c)}
                style={{ width: square, height: square, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}
              >
                {/* move target highlight */}
                {target && !p && (
                  <View style={{ width: square * 0.28, height: square * 0.28, borderRadius: 9999, backgroundColor: "rgba(0,0,0,0.35)" }} />
                )}
                {target && p && (
                  <View style={{ position: "absolute", inset: 0, borderWidth: 3, borderColor: isCapture ? "rgba(255,0,0,0.6)" : "rgba(0,0,0,0.45)" }} />
                )}
                {/* selected square outline */}
                {selectedHere && (
                  <View style={{ position: "absolute", inset: 0, borderWidth: 3, borderColor: "rgba(255, 215, 0, 0.7)" }} />
                )}
                {/* last move highlight color-coded */}
                {model.lastMove && (model.lastMove.from === sq || model.lastMove.to === sq) && (
                  <View style={{ position: "absolute", inset: 0, backgroundColor: model.lastMoveCorrect === undefined ? "rgba(255,225,0,0.25)" : (model.lastMoveCorrect ? "rgba(46,204,113,0.35)" : "rgba(231,76,60,0.35)") }} />
                )}
                {/* correctness icon only on destination square */}
                {model.lastMove && model.lastMove.to === sq && model.lastMoveCorrect !== undefined && (
                  <Ionicons
                    name={model.lastMoveCorrect ? "checkmark-circle" : "close-circle"}
                    size={Math.floor(square * 0.5)}
                    color={model.lastMoveCorrect ? "#2ecc71" : "#e74c3c"}
                    style={{ position: 'absolute', left: 4, top: 4 }}
                  />
                )}
                {/* piece */}
                {p && (
                  <FontAwesome5
                    name={iconName(p.type)}
                    size={Math.floor(square * 0.7)}
                    color={p.color === "w" ? "#ffffff" : "#000000"}
                    solid
                  />
                )}
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

const MemoBoard = React.memo(
  Board,
  (prev, next) => prev.model.id === next.model.id && prev.model.version === next.model.version && prev.size === next.size
);

export default function Puzzles() {
  const { boards, addBoard, setBoards } = useBoards(2);
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<FlatList<BoardModel>>(null);
  // Removed transient top banner; keep only persistent status banner under tactic

  const moveSoundRef = useRef<Audio.Sound | null>(null);
  const captureSoundRef = useRef<Audio.Sound | null>(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const move = new Audio.Sound();
        const cap = new Audio.Sound();
        await move.loadAsync(require('../../assets/sounds/move.mp3'));
        await cap.loadAsync(require('../../assets/sounds/capture.mp3'));
        if (!mounted) { await move.unloadAsync(); await cap.unloadAsync(); return; }
        moveSoundRef.current = move;
        captureSoundRef.current = cap;
      } catch {}
    })();
    return () => {
      mounted = false;
      (async () => {
        try { await moveSoundRef.current?.unloadAsync(); } catch {}
        try { await captureSoundRef.current?.unloadAsync(); } catch {}
      })();
    };
  }, []);

  // Compute available vertical height by subtracting the tab bar height and bottom inset
  const NAV_HEIGHT = 64; // matches tabs _layout.tsx
  const windowDims = Dimensions.get("window");
  const pageHeight = useMemo(() => windowDims.height - NAV_HEIGHT - insets.bottom, [windowDims.height, insets.bottom]);
  // Board should span full screen width
  const boardSize = useMemo(() => windowDims.width, [windowDims.width]);

  const keyExtractor = useCallback((item: BoardModel, index: number) => item.id ?? `board-${index}` as string, []);
  const ensurePreload = (idx: number) => {
    // Keep at least 2 items ahead
    if (boards.length - idx < 3) {
      addBoard();
    }
  };
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      if (typeof idx === "number") setCurrentIndex(idx);
      if (typeof idx === "number") ensurePreload(idx);
    }
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const getItemLayout = useCallback((_data: any, index: number) => ({ length: pageHeight, offset: pageHeight * index, index }), [pageHeight]);

  const currentBoard = boards[currentIndex];

  // per-board toggles and updates

  const onDoubleTap = useCallback(() => {
    if (!currentBoard) return;
    // toggle like for current board
    // we'll update boards state immutably
    setBoards((prev: BoardModel[]) => prev.map((b: BoardModel, i: number) => (i === currentIndex ? { ...b, liked: !b.liked } : b)));
  }, [currentBoard, currentIndex]);

  const onTapLike = useCallback(() => {
    if (!currentBoard) return;
    setBoards((prev: BoardModel[]) => prev.map((b: BoardModel, i: number) => (i === currentIndex ? { ...b, liked: !b.liked } : b)));
  }, [currentBoard, currentIndex]);

  const onTapStar = useCallback(() => {
    if (!currentBoard) return;
    setBoards((prev: BoardModel[]) => prev.map((b: BoardModel, i: number) => (i === currentIndex ? { ...b, starred: !b.starred } : b)));
  }, [currentBoard, currentIndex]);

  const onMovePlayed = useCallback((id: string, last: LastMove, isCapture: boolean) => {
    if (isCapture) {
      captureSoundRef.current?.replayAsync().catch(() => {});
    } else {
      moveSoundRef.current?.replayAsync().catch(() => {});
    }
    setBoards((prev: BoardModel[]) => prev.map((b: BoardModel, i: number) => {
      if (b.id !== id) return b;
      const step = b.stepIndex ?? 0;
      const expected = b.solution[step];
      const playedMatches = expected ? (expected.from === last.from && expected.to === last.to) : true;
      if (!playedMatches) {
        setTimeout(() => {
          const nextIdx = Math.min(i + 1, prev.length - 1);
          listRef.current?.scrollToIndex({ index: nextIdx, animated: true });
        }, 350);
        return { ...b, lastMove: last, lastMoveCorrect: false, correctSquares: [], version: b.version + 1 };
      }
      // correct move
      const nextStep = step + 1;
      const solvedNow = nextStep >= (b.solution?.length ?? 0) && (b.solution?.length ?? 0) > 0;
      if (solvedNow) {
        setTimeout(() => {
          const nextIdx = Math.min(i + 1, prev.length - 1);
          listRef.current?.scrollToIndex({ index: nextIdx, animated: true });
        }, 550);
      } else {
      }
      return {
        ...b,
        lastMove: last,
        lastMoveCorrect: true,
        stepIndex: nextStep,
        solved: solvedNow ? true : b.solved,
        // keep only latest destination for potential future use
        correctSquares: [last.to],
        version: b.version + 1,
      };
    }));
  }, [setBoards]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <TapGestureHandler numberOfTaps={2} onActivated={onDoubleTap} maxDelayMs={90}>
        <View style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            style={{ flex: 1 }}
            pagingEnabled
            decelerationRate="fast"
            snapToAlignment="start"
            contentContainerStyle={{}}
            data={boards}
            renderItem={({ item }) => (
              <View style={[styles.page, { height: pageHeight }]}>
                <MemoBoard model={item} size={boardSize} onMovePlayed={onMovePlayed} />
                {/* Per-board overlays */}
                <View style={styles.itemOverlays} pointerEvents="box-none">
                  {/* Tactic top-left */}
                  <View style={styles.tacticBanner}><Text style={styles.tacticText}>{item.tactic}</Text></View>
                  {/* Persistent status banner below tactic on current board */}
                  
                    {item.id === boards[currentIndex]?.id && (() => {
                      const boardTop = (pageHeight - boardSize) / 2; // distance from top to board
                      const desiredTop = boardTop - 62; // banner height (~40) + margin (~12)
                      const isSolved = !!item.solved;
                      const isCorrect = item.lastMoveCorrect === true;
                      const isIncorrect = item.lastMoveCorrect === false;
                      const green = '#2ecc71';
                      const red = '#e74c3c';
                      let bgColor = 'rgba(255, 255, 255, 1)';
                      if(isSolved || isCorrect) {
                        bgColor = green;
                      }
                      else if(isIncorrect) {
                        bgColor = red;
                      }
                      const text = isSolved
                        ? 'Solution found'
                        : item.lastMoveCorrect === undefined
                        ? 'Can You Solve This Puzzle?'
                        : isCorrect
                        ? 'Correct move'
                        : 'Incorrect move';
                      return (
                        <View
                          style={[
                            styles.statusBanner,
                            {
                              top: Math.max(20, desiredTop), // clamp to keep visible
                              width: boardSize - 40, // match board minus horizontal margin
                              backgroundColor: bgColor,
                            },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.statusText, (isSolved || isCorrect) && { color: '#ffffff' }]}>
                              {text}
                            </Text>
                            {isCorrect || isSolved ? (
                              <Ionicons name="checkmark" size={18} color="#ffffffff" style={{ marginLeft: 8 }} />
                            ) : isIncorrect ? (
                              <Ionicons name="close" size={18} color="#000000ff" style={{ marginLeft: 8 }} />
                            ) : null}
                          </View>
                        </View>
                      );
                    })()}
                  {/* Turn bottom-left (fixed per puzzle) */}
                  <View style={styles.turnBanner}><Text style={styles.turnText}>{item.sideToPlay === 'w' ? 'White to play' : 'Black to play'}</Text></View>
                  {/* Like/Star top-right */}
                  <LikeStarActions item={item} setBoards={setBoards} />
                </View>
              </View>
            )}
            keyExtractor={keyExtractor}
            onEndReached={addBoard}
            onEndReachedThreshold={0.3}
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            extraData={boards}
            windowSize={3}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            removeClippedSubviews
            getItemLayout={getItemLayout}
          />
        </View>
      </TapGestureHandler>
    </SafeAreaView>
  );
}

// Animated like/star actions component
function LikeStarActions({ item, setBoards }: { item: BoardModel; setBoards: React.Dispatch<React.SetStateAction<BoardModel[]>> }) {
  const heartScale = React.useRef(new Animated.Value(1)).current;
  const heartRotate = React.useRef(new Animated.Value(0)).current;
  const [bursts, setBursts] = React.useState<{ id: number; angle: number; anim: Animated.Value }[]>([]);
  const RED = '#ff4d67';

  const spawnBursts = () => {
    const count = 10;
    const created: { id: number; angle: number; anim: Animated.Value }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.4 - 0.2);
      created.push({ id: Date.now() + i, angle, anim: new Animated.Value(0) });
    }
    setBursts(created);
    Animated.stagger(18, created.map(b => (
      Animated.timing(b.anim, { toValue: 1, duration: 820, useNativeDriver: true })
    ))).start(() => {
      setTimeout(() => setBursts([]), 80);
    });
  };

  const animateHeart = () => {
    heartScale.setValue(1);
    heartRotate.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 1.55, duration: 160, useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 0.9, duration: 150, useNativeDriver: true }),
        Animated.spring(heartScale, { toValue: 1.0, friction: 5, useNativeDriver: true })
      ]),
      Animated.sequence([
        Animated.timing(heartRotate, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(heartRotate, { toValue: 0, duration: 300, useNativeDriver: true })
      ])
    ]).start();
  };

  const toggleLike = () => {
    setBoards(prev => prev.map(b => b.id === item.id ? { ...b, liked: !b.liked } : b));
    const nowLiked = !item.liked;
    // Animation now unified in useEffect to avoid double-trigger race; no direct call here.
  };

  // Run animation also when liked state flips to true externally (e.g. double tap outside heart)
  const prevLikedRef = React.useRef(item.liked);
  React.useEffect(() => {
    if (!prevLikedRef.current && item.liked) {
      animateHeart();
      spawnBursts();
    }
    prevLikedRef.current = item.liked;
  }, [item.liked]);

  const toggleStar = () => {
    setBoards(prev => prev.map(b => b.id === item.id ? { ...b, starred: !b.starred } : b));
  };

  return (
    <View style={styles.itemActions}>
      <Animated.View style={{ transform: [
        { scale: heartScale },
        { rotate: heartRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '15deg'] }) }
      ] }}>
        <Pressable
          onPress={toggleLike}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={item.liked ? 'Unlike' : 'Like'}
          style={{ marginBottom: 14 }}
        >
          <Ionicons name={item.liked ? 'heart' : 'heart-outline'} size={34} color="#fff" />
        </Pressable>
      </Animated.View>
      <Pressable
        onPress={toggleStar}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={item.starred ? 'Unstar' : 'Star'}
      >
        <Ionicons name={item.starred ? 'star' : 'star-outline'} size={30} color="#fff" />
      </Pressable>
      {bursts.map(b => {
        const radius = 50;
        const tx = Math.cos(b.angle) * radius;
        const ty = Math.sin(b.angle) * radius * -1;
        return (
          <Animated.View
            key={b.id}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              opacity: b.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.85, 0] }),
              transform: [
                { translateX: b.anim.interpolate({ inputRange: [0, 1], outputRange: [0, tx] }) },
                { translateY: b.anim.interpolate({ inputRange: [0, 1], outputRange: [0, ty] }) },
                { scale: b.anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) },
                { rotate: b.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '160deg'] }) }
              ],
            }}
          >
            <Ionicons name={'heart'} size={16} color={RED} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  page: { alignItems: "center", justifyContent: "center" },
  boardFrame: { backgroundColor: BEIGE, borderRadius: 8, overflow: "hidden" },
  itemOverlays: { position: "absolute", inset: 0 },
  itemActions: { position: "absolute", right: 20, bottom: 40, gap: 10, alignItems: 'flex-end' },
  tacticBanner: { position: "absolute", left: 20, top: 48, justifyContent: "center" },
  tacticText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  // Persistent status banner: rectangular box with border and inner horizontal margin
  statusBanner: {
    position: 'absolute',
    left: 20,
    top: 88,
    paddingVertical: 6,
    paddingHorizontal: 14, // x-margin inside the box
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)', 
    height: 45,
    justifyContent: 'center',
  },
  statusText: { color: '#000000ff', fontSize: 16, fontWeight: '700'},
  turnBanner: { position: "absolute", left: 20, bottom: 42, justifyContent: "center" },
  turnText: { color: "#fff", fontSize: 24, fontWeight: "800" },
  // Removed transient top banner styles
});
