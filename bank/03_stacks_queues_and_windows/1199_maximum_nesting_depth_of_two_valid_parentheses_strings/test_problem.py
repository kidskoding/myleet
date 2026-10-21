from solution import max_depth_after_split


def _max_depth(seq: str, group: int, assign: list[int]) -> int:
    d = best = 0
    for ch, a in zip(seq, assign):
        if a != group:
            continue
        if ch == "(":
            d += 1
            best = max(best, d)
        else:
            d -= 1
    return best


def _valid_split(seq: str, assign: list[int]) -> bool:
    if len(assign) != len(seq):
        return False
    for g in (0, 1):
        bal = 0
        for ch, a in zip(seq, assign):
            if a != g:
                continue
            bal += 1 if ch == "(" else -1
            if bal < 0:
                return False
        if bal != 0:
            return False
    return True


def test_max_depth_after_split_example_one():
    seq = "(()())"
    assign = max_depth_after_split(seq)
    assert _valid_split(seq, assign)
    assert max(_max_depth(seq, 0, assign), _max_depth(seq, 1, assign)) == 1


def test_max_depth_after_split_example_two():
    seq = "()(())()"
    assign = max_depth_after_split(seq)
    assert _valid_split(seq, assign)
    assert max(_max_depth(seq, 0, assign), _max_depth(seq, 1, assign)) <= 2


def test_max_depth_after_split_simple():
    seq = "()"
    assign = max_depth_after_split(seq)
    assert _valid_split(seq, assign)


def test_max_depth_after_split_nested():
    seq = "(((())))"
    assign = max_depth_after_split(seq)
    assert _valid_split(seq, assign)
    assert max(_max_depth(seq, 0, assign), _max_depth(seq, 1, assign)) == 2
