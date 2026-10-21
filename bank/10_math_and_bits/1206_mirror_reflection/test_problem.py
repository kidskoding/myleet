from solution import mirror_reflection


def test_mirror_reflection_example_one():
    assert mirror_reflection(2, 1) == 2


def test_mirror_reflection_example_two():
    assert mirror_reflection(3, 1) == 1


def test_mirror_reflection_receptor_zero():
    assert mirror_reflection(3, 2) == 0


def test_mirror_reflection_equal():
    assert mirror_reflection(4, 4) == 1


def test_mirror_reflection_q_half():
    assert mirror_reflection(4, 2) == 2
