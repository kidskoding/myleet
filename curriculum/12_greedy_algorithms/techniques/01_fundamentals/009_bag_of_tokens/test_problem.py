from solution import bag_of_tokens_score


def test_bag_of_tokens_score_trades_down():
    assert bag_of_tokens_score([100, 200, 300, 400], 200) == 2


def test_bag_of_tokens_score_cannot_play_any():
    assert bag_of_tokens_score([100], 50) == 0


def test_bag_of_tokens_score_single_affordable_token():
    assert bag_of_tokens_score([100], 200) == 1
