from solution import invalid_transactions


def test_invalid_transactions_city_conflict():
    txs = ["alice,20,800,mtv", "alice,50,100,beijing"]
    assert sorted(invalid_transactions(txs)) == sorted(txs)


def test_invalid_transactions_large_amount():
    assert invalid_transactions(["alice,20,800,mtv", "alice,50,1200,mtv"]) == ["alice,50,1200,mtv"]


def test_invalid_transactions_different_names():
    assert invalid_transactions(["alice,20,800,mtv", "bob,50,1200,mtv"]) == ["bob,50,1200,mtv"]


def test_invalid_transactions_exactly_sixty_minutes():
    txs = ["bob,0,10,nyc", "bob,60,10,sf", "bob,121,10,la"]
    assert sorted(invalid_transactions(txs)) == ["bob,0,10,nyc", "bob,60,10,sf"]


def test_invalid_transactions_duplicates_reported_twice():
    txs = ["amy,5,2000,rome", "amy,5,2000,rome"]
    assert invalid_transactions(txs) == txs


def test_invalid_transactions_all_valid():
    assert invalid_transactions(["eve,10,1000,oslo", "eve,30,5,oslo"]) == []
