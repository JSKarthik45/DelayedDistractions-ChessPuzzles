import React, { useCallback, useMemo, useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, StatusBar, StyleSheet, View, PixelRatio, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { TapGestureHandler } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chess, type Square, type Move } from "chess.js";

const GREEN = "#739552" as const;
const BEIGE = "#ebecd0" as const;
const BOARD_SIZE = 8;
const TACTICS = [
  "Double Attack",
  "Fork",
  "Pin",
  "Skewer",
  "Discovered Attack",
  "Zwischenzug",
  "Back Rank Mate",
  "Smothered Mate",
  "Queen Sacrifice",
  "Deflection",
  "Decoy",
  "Overloading",
  "Trapped Piece",
] as const;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type BoardModel = { id: string; chess: Chess; liked: boolean; starred: boolean; version: number; tactic: string };

function createBoard(id: string): BoardModel {
  const chess = new Chess();
  // Randomize position by playing a series of random legal moves from the start
  const plies = 10 + Math.floor(Math.random() * 20); // 10-30 plies
  for (let i = 0; i < plies; i++) {
    const moves = chess.moves();
    if (!moves.length) break;
    const mv = moves[Math.floor(Math.random() * moves.length)];
    chess.move(mv as any);
  }
  // Randomize side to move by optionally making one more move
  if (Math.random() < 0.5) {
    const moves = chess.moves();
    if (moves.length) chess.move(moves[Math.floor(Math.random() * moves.length)] as any);
  }
  const tactic = TACTICS[Math.floor(Math.random() * TACTICS.length)];
  return { id, chess, liked: false, starred: false, version: 0, tactic };
}

function useBoards(initial = 2) {
  const [boards, setBoards] = useState<BoardModel[]>(() =>
    Array.from({ length: initial }, (_, i) => createBoard(`b-${i}`))
  );
  const loadingRef = useRef(false);
  const addBoard = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setTimeout(() => {
      setBoards((prev) => [...prev, createBoard(`b-${prev.length}`)]);
      loadingRef.current = false;
    }, 5);
  }, []);
  return { boards, addBoard, setBoards };
}

function Board({ model, size, onPositionChange }: { model: BoardModel; size: number; onPositionChange: (id: string) => void }) {
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
      chess.move({ from: mv.from, to: mv.to, promotion: "q" });
      setSelected(null);
      setMoves([]);
      force((v) => v + 1);
      onPositionChange(model.id);
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
  const turnLabel = useMemo(() => {
    const b = currentBoard;
    if (!b) return "";
    return b.chess.turn() === "w" ? "White to play" : "Black to play";
  }, [currentBoard]);
  const tacticLabel = currentBoard?.tactic ?? "";

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

  const onBoardPositionChange = useCallback((id: string) => {
    // bump version to trigger updates dependent on boards state (e.g., turn label)
    setBoards((prev: BoardModel[]) => prev.map((b: BoardModel) => (b.id === id ? { ...b, version: b.version + 1 } : b)));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <TapGestureHandler numberOfTaps={2} onActivated={onDoubleTap} maxDelayMs={90}>
        <View style={{ flex: 1 }}>
          <FlatList
            style={{ flex: 1 }}
            pagingEnabled
            decelerationRate="fast"
            snapToAlignment="start"
            contentContainerStyle={{}}
            data={boards}
            renderItem={({ item }) => (
              <View style={[styles.page, { height: pageHeight }]}>
                <MemoBoard model={item} size={boardSize} onPositionChange={onBoardPositionChange} />
                {/* Per-board overlays */}
                <View style={styles.itemOverlays} pointerEvents="box-none">
                  {/* Tactic top-left */}
                  <View style={styles.tacticBanner}><Text style={styles.tacticText}>{item.tactic}</Text></View>
                  {/* Turn bottom-left */}
                  <View style={styles.turnBanner}><Text style={styles.turnText}>{item.chess.turn() === 'w' ? 'White to play' : 'Black to play'}</Text></View>
                  {/* Like/Star top-right */}
                  <View style={styles.itemActions}>
                    <Pressable
                      onPress={() => setBoards((prev: BoardModel[]) => prev.map((b: BoardModel) => b.id === item.id ? { ...b, liked: !b.liked } : b))}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={item.liked ? "Unlike" : "Like"}
                      style={{ marginBottom: 14 }}
                    >
                      <Ionicons name={item.liked ? "heart" : "heart-outline"} size={28} color="#fff" />
                    </Pressable>
                    <Pressable
                      onPress={() => setBoards((prev: BoardModel[]) => prev.map((b: BoardModel) => b.id === item.id ? { ...b, starred: !b.starred } : b))}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={item.starred ? "Unstar" : "Star"}
                    >
                      <Ionicons name={item.starred ? "star" : "star-outline"} size={28} color="#fff" />
                    </Pressable>
                  </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  page: { alignItems: "center", justifyContent: "center" },
  boardFrame: { backgroundColor: BEIGE, borderRadius: 8, overflow: "hidden" },
  itemOverlays: { position: "absolute", inset: 0 },
  itemActions: { position: "absolute", right: 20, bottom: 40, gap: 10 },
  tacticBanner: { position: "absolute", left: 20, top: 48, justifyContent: "center" },
  tacticText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  turnBanner: { position: "absolute", left: 20, bottom: 42, justifyContent: "center" },
  turnText: { color: "#fff", fontSize: 24, fontWeight: "800" },
});
