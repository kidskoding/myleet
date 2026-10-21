from list_node import ListNode
from solution import LinkedListRandomNode


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def test_linked_list_random_node_single():
    picker = LinkedListRandomNode(build_list([7]))
    assert all(picker.get_random() == 7 for _ in range(20))


def test_linked_list_random_node_covers_all_values():
    values = [1, 2, 3]
    picker = LinkedListRandomNode(build_list(values))
    draws = [picker.get_random() for _ in range(300)]
    assert set(draws) == set(values)


def test_linked_list_random_node_roughly_uniform():
    picker = LinkedListRandomNode(build_list([10, 20, 30]))
    draws = [picker.get_random() for _ in range(9000)]
    for value in (10, 20, 30):
        ratio = draws.count(value) / len(draws)
        assert 0.25 < ratio < 0.42
