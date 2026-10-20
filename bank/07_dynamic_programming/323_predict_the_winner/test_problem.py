from solution import predict_the_winner


def test_predict_the_winner_loses():
    assert predict_the_winner([1, 5, 2]) is False


def test_predict_the_winner_wins():
    assert predict_the_winner([1, 5, 233, 7]) is True


def test_predict_the_winner_single():
    assert predict_the_winner([5]) is True


def test_predict_the_winner_tie_counts_as_win():
    assert predict_the_winner([1, 1]) is True


def test_predict_the_winner_tie_after_optimal_play():
    assert predict_the_winner([1, 5, 2, 4, 6]) is True


def test_predict_the_winner_zeros():
    assert predict_the_winner([0, 0, 7, 0]) is True
