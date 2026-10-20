from solution import push_dominoes


def test_push_dominoes_no_change():
    assert push_dominoes("RR.L") == "RR.L"


def test_push_dominoes_mixed():
    assert push_dominoes(".L.R...LR..L..") == "LL.RR.LLRRLL.."


def test_push_dominoes_single_upright():
    assert push_dominoes(".") == "."


def test_push_dominoes_push_right_to_end():
    assert push_dominoes("R...") == "RRRR"


def test_push_dominoes_push_left_to_start():
    assert push_dominoes("...L") == "LLLL"


def test_push_dominoes_balanced_middle():
    assert push_dominoes("R.L") == "R.L"
    assert push_dominoes("R..L") == "RRLL"
