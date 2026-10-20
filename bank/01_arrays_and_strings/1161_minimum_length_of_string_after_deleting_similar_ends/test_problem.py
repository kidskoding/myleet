from solution import minimum_length


def test_minimum_length_no_move():
    assert minimum_length("ca") == 2


def test_minimum_length_everything_removed():
    assert minimum_length("cabaabac") == 0


def test_minimum_length_runs_of_different_lengths():
    assert minimum_length("aabccabba") == 3


def test_minimum_length_single_character():
    assert minimum_length("a") == 1


def test_minimum_length_middle_character_left():
    assert minimum_length("aba") == 1


def test_minimum_length_same_character_throughout():
    assert minimum_length("aa") == 0
    assert minimum_length("abbbba") == 0
