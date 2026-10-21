from list_node import ListNode
from solution import insert_greatest_common_divisors


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_insert_greatest_common_divisors_example():
    assert to_list(insert_greatest_common_divisors(build_list([18, 6, 10, 3]))) == [
        18,
        6,
        6,
        2,
        10,
        1,
        3,
    ]


def test_insert_greatest_common_divisors_two_nodes():
    assert to_list(insert_greatest_common_divisors(build_list([7, 7]))) == [7, 7, 7]


def test_insert_greatest_common_divisors_single():
    assert to_list(insert_greatest_common_divisors(build_list([5]))) == [5]
